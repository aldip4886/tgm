import { prisma } from "../lib/db";

const DEFAULT_TEAM_NAMES = [
  "Team Alpha",
  "Team Beta",
  "Team Gamma",
  "Team Delta",
  "Team Epsilon",
  "Team Zeta",
  "Team Theta",
  "Team Omega",
];

export async function autoSplitParticipants(
  sessionId: string,
  teamCount: number,
  customNames?: string[]
) {
  if (teamCount < 1) throw new Error("Team count must be at least 1");

  return await prisma.$transaction(async (tx) => {
    // 1. Fetch or create teams
    let existingTeams = await tx.team.findMany({
      where: { sessionId },
      orderBy: { createdAt: "asc" },
    });
    const initialCount = existingTeams.length;
    if (existingTeams.length < teamCount) {
      const needed = teamCount - existingTeams.length;
      for (let i = 0; i < needed; i++) {
        const teamIndex = initialCount + i;
        const name =
          customNames?.[teamIndex] ||
          DEFAULT_TEAM_NAMES[teamIndex % DEFAULT_TEAM_NAMES.length] +
            (teamIndex >= DEFAULT_TEAM_NAMES.length ? ` ${Math.floor(teamIndex / DEFAULT_TEAM_NAMES.length) + 1}` : "");

        const newTeam = await tx.team.create({
          data: {
            sessionId,
            name,
            totalPoints: 0,
          },
        });
        existingTeams.push(newTeam);
      }
    }

    const activeTeams = existingTeams.slice(0, teamCount);

    // 2. Fetch all participants in session
    const participants = await tx.sessionParticipant.findMany({
      where: { sessionId },
      orderBy: { joinedAt: "asc" },
    });

    // 3. Distribute round-robin
    for (let i = 0; i < participants.length; i++) {
      const assignedTeam = activeTeams[i % activeTeams.length];
      await tx.sessionParticipant.update({
        where: { id: participants[i].id },
        data: { teamId: assignedTeam.id },
      });
    }

    await tx.event.create({
      data: {
        sessionId,
        eventType: "TEAMS_AUTO_SPLIT",
        metadata: JSON.stringify({
          teamCount,
          participantCount: participants.length,
        }),
      },
    });

    // Return teams with members in exact order
    const teamIds = activeTeams.map((t) => t.id);
    const teamsWithMembers = await tx.team.findMany({
      where: { sessionId, id: { in: teamIds } },
      include: {
        members: true,
      },
    });

    return activeTeams.map((t) => teamsWithMembers.find((tw) => tw.id === t.id)!);
  });
}

export async function reassignParticipantTeam(
  participantId: string,
  targetTeamId: string | null
) {
  return await prisma.$transaction(async (tx) => {
    const participant = await tx.sessionParticipant.update({
      where: { id: participantId },
      data: { teamId: targetTeamId },
      include: { team: true },
    });

    await tx.event.create({
      data: {
        sessionId: participant.sessionId,
        actorId: participantId,
        eventType: "TEAM_MEMBER_REASSIGNED",
        metadata: JSON.stringify({ targetTeamId }),
      },
    });

    return participant;
  });
}

export async function getTeams(sessionId: string) {
  return await prisma.team.findMany({
    where: { sessionId },
    include: {
      members: {
        orderBy: { displayName: "asc" },
      },
      points: true,
      whiteboards: true,
    },
    orderBy: { totalPoints: "desc" },
  });
}

export async function awardTeamPoints(
  sessionId: string,
  teamId: string,
  amount: number,
  category: string = "TEAM",
  reason?: string,
  activityId?: string
) {
  if (amount <= 0) throw new Error("Amount must be positive");
  return await prisma.$transaction(async (tx) => {
    const point = await tx.point.create({
      data: {
        sessionId,
        teamId,
        activityId,
        category,
        amount,
        reason: reason?.trim(),
      },
    });

    const updatedTeam = await tx.team.update({
      where: { id: teamId },
      data: { totalPoints: { increment: amount } },
    });

    await tx.event.create({
      data: {
        sessionId,
        activityId,
        eventType: "TEAM_POINT_AWARDED",
        metadata: JSON.stringify({ teamId, amount, category, reason }),
      },
    });

    return { point, team: updatedTeam };
  });
}

