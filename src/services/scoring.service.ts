import { prisma } from "../lib/db";

export type PointCategory =
  | "PARTICIPATION"
  | "PEER"
  | "CHALLENGE"
  | "FACILITATOR"
  | "TEAM"
  | "BONUS";

export interface AwardPointsInput {
  sessionId: string;
  participantId?: string | null;
  teamId?: string | null;
  activityId?: string | null;
  responseId?: string | null;
  category: PointCategory;
  amount: number;
  giverId?: string | null;
  reason?: string;
}

export async function awardPoints(input: AwardPointsInput) {
  const {
    sessionId,
    participantId,
    teamId: directTeamId,
    activityId,
    responseId,
    category,
    amount,
    giverId,
    reason,
  } = input;

  if (amount <= 0) throw new Error("Point amount must be greater than zero");

  return await prisma.$transaction(async (tx) => {
    let resolvedTeamId = directTeamId || null;
    let participant: any = null;

    if (participantId) {
      participant = await tx.sessionParticipant.findUnique({
        where: { id: participantId },
      });
      if (!participant) throw new Error("Participant not found");

      if (!resolvedTeamId && participant.teamId) {
        resolvedTeamId = participant.teamId;
      }

      // Materialize participant total score
      await tx.sessionParticipant.update({
        where: { id: participantId },
        data: { totalPoints: { increment: amount } },
      });
    }

    if (resolvedTeamId) {
      // Materialize team total score
      await tx.team.update({
        where: { id: resolvedTeamId },
        data: { totalPoints: { increment: amount } },
      });
    }

    // Append-only points ledger entry (ADR-0011)
    const point = await tx.point.create({
      data: {
        sessionId,
        participantId: participantId || null,
        teamId: resolvedTeamId,
        activityId: activityId || null,
        responseId: responseId || null,
        category,
        amount,
        giverId: giverId || null,
        reason: reason?.trim() || null,
      },
    });

    await tx.event.create({
      data: {
        sessionId,
        activityId: activityId || null,
        actorId: giverId || participantId || null,
        targetId: point.id,
        eventType: "POINT_AWARDED",
        metadata: JSON.stringify({
          recipientId: participantId,
          teamId: resolvedTeamId,
          amount,
          category,
          reason,
        }),
      },
    });

    return point;
  });
}

export async function getLeaderboard(sessionId: string) {
  const [participants, teams] = await Promise.all([
    prisma.sessionParticipant.findMany({
      where: { sessionId },
      include: {
        team: true,
        pointsReceived: true,
      },
      orderBy: [{ totalPoints: "desc" }, { joinedAt: "asc" }],
    }),
    prisma.team.findMany({
      where: { sessionId },
      include: {
        members: true,
        points: true,
      },
      orderBy: [{ totalPoints: "desc" }, { createdAt: "asc" }],
    }),
  ]);

  const rankedParticipants = participants.map((p, index) => {
    const categories: Record<PointCategory, number> = {
      PARTICIPATION: 0,
      PEER: 0,
      CHALLENGE: 0,
      FACILITATOR: 0,
      TEAM: 0,
      BONUS: 0,
    };

    for (const pt of p.pointsReceived) {
      const cat = pt.category as PointCategory;
      if (categories[cat] !== undefined) {
        categories[cat] += pt.amount;
      }
    }

    return {
      id: p.id,
      displayName: p.displayName,
      totalPoints: p.totalPoints,
      rank: index + 1,
      team: p.team ? { id: p.team.id, name: p.team.name } : null,
      categories,
    };
  });

  const rankedTeams = teams.map((t, index) => {
    const categories: Record<PointCategory, number> = {
      PARTICIPATION: 0,
      PEER: 0,
      CHALLENGE: 0,
      FACILITATOR: 0,
      TEAM: 0,
      BONUS: 0,
    };

    for (const pt of t.points) {
      const cat = pt.category as PointCategory;
      if (categories[cat] !== undefined) {
        categories[cat] += pt.amount;
      }
    }

    return {
      id: t.id,
      name: t.name,
      totalPoints: t.totalPoints,
      rank: index + 1,
      memberCount: t.members.length,
      members: t.members.map((m) => ({ id: m.id, displayName: m.displayName })),
      categories,
    };
  });

  return {
    participants: rankedParticipants,
    teams: rankedTeams,
  };
}

export async function setLeaderboardVisibility(
  sessionId: string,
  visibility: "HIDDEN" | "LIVE" | "END_OF_ACTIVITY",
  actorId?: string
) {
  return await prisma.$transaction(async (tx) => {
    const updated = await tx.session.update({
      where: { id: sessionId },
      data: { leaderboardVisibility: visibility },
    });

    await tx.event.create({
      data: {
        sessionId,
        actorId: actorId || null,
        eventType: "LEADERBOARD_VISIBILITY_UPDATED",
        metadata: JSON.stringify({ visibility }),
      },
    });

    return updated;
  });
}
