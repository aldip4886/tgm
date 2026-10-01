import { prisma } from "../lib/db";
import { getLeaderboard } from "./scoring.service";

export async function exportSessionData(sessionId: string) {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: {
      facilitator: true,
      participants: {
        include: {
          team: true,
          badges: {
            include: {
              badge: true,
            },
          },
        },
      },
      teams: {
        include: {
          members: true,
        },
      },
      presentationMappings: true,
      activities: {
        include: {
          responses: {
            include: {
              comments: true,
              reactions: true,
            },
          },
          whiteboards: true,
        },
      },
      points: {
        orderBy: { createdAt: "asc" },
      },
      events: {
        orderBy: { timestamp: "asc" },
      },
    },
  });

  if (!session) {
    throw new Error("Session not found");
  }

  // Presentations & Mappings
  const presentations = session.canvaPresentationUrl
    ? [
        {
          sessionId: session.id,
          canvaUrl: session.canvaPresentationUrl,
          slideCount: session.canvaSlideCount || 0,
          createdAt: session.createdAt,
        },
      ]
    : [];

  const presentationMappings = session.presentationMappings.map((m) => ({
    id: m.id,
    sessionId: m.sessionId,
    slideNumber: m.slideNumber,
    title: m.title,
    checkpoint: m.checkpoint,
    activityId: m.activityId,
    createdAt: m.createdAt,
  }));

  // Flatten responses, comments, and likes
  const responses = session.activities.flatMap((a) => a.responses);
  const comments = responses.flatMap((r) => r.comments);
  const likes = responses.flatMap((r) => r.reactions);

  // Flatten whiteboards
  const whiteboards = session.activities.flatMap((a) => a.whiteboards);

  // Questions and cases
  const questions = session.activities.map((a) => ({
    id: a.id,
    activityId: a.id,
    title: a.title,
    prompt: a.prompt,
    type: a.type,
    revealMode: a.revealMode,
  }));

  const cases = session.activities
    .filter((a) => a.title.toLowerCase().includes("case") || a.prompt.toLowerCase().includes("case"))
    .map((a) => ({
      id: a.id,
      title: a.title,
      prompt: a.prompt,
    }));

  // Scores
  const scores = session.participants.map((p) => ({
    participantId: p.id,
    displayName: p.displayName,
    teamId: p.teamId,
    teamName: p.team?.name || null,
    totalPoints: p.totalPoints,
    peerPointBudget: p.peerPointBudget,
  }));

  // Leaderboard
  const leaderboard = await getLeaderboard(sessionId);

  // Badges
  const badges = session.participants.flatMap((p) =>
    p.badges.map((b) => ({
      id: b.id,
      participantId: p.id,
      participantName: p.displayName,
      badgeId: b.badgeId,
      badge: {
        name: b.badge.name,
        description: b.badge.description,
        icon: b.badge.icon,
        ruleType: b.badge.ruleType,
      },
      reason: b.reason,
      awardedBy: b.awardedBy,
      awardedAt: b.createdAt,
    }))
  );

  // Timers
  const timers = session.activities.map((a) => ({
    activityId: a.id,
    title: a.title,
    timerStatus: a.timerStatus,
    timerEndsAt: a.timerEndsAt,
    timerRemainingMs: a.timerRemainingMs,
  }));

  return {
    schema_version: "1.0",
    session: {
      id: session.id,
      code: session.code,
      title: session.title,
      description: session.description,
      status: session.status,
      leaderboardVisibility: session.leaderboardVisibility,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
    },
    facilitator: session.facilitator
      ? {
          id: session.facilitator.id,
          name: session.facilitator.name,
          email: session.facilitator.email,
          role: session.facilitator.role,
        }
      : null,
    participants: session.participants.map((p) => ({
      id: p.id,
      displayName: p.displayName,
      role: p.role,
      isConnected: p.isConnected,
      joinedAt: p.joinedAt,
      totalPoints: p.totalPoints,
      peerPointBudget: p.peerPointBudget,
      teamId: p.teamId,
      teamName: p.team?.name || null,
    })),
    teams: session.teams.map((t) => ({
      id: t.id,
      name: t.name,
      totalPoints: t.totalPoints,
      memberCount: t.members.length,
      members: t.members.map((m) => ({
        id: m.id,
        displayName: m.displayName,
      })),
      createdAt: t.createdAt,
    })),
    presentations,
    presentation_activity_mappings: presentationMappings,
    activities: session.activities.map((a) => ({
      id: a.id,
      title: a.title,
      prompt: a.prompt,
      type: a.type,
      state: a.state,
      revealMode: a.revealMode,
      responseCount: a.responses.length,
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
    })),
    cases,
    questions,
    responses: responses.map((r) => ({
      id: r.id,
      activityId: r.activityId,
      participantId: r.participantId,
      teamId: r.teamId,
      content: r.content,
      color: r.color,
      isHidden: r.isHidden,
      commentCount: r.comments.length,
      likeCount: r.reactions.length,
      createdAt: r.createdAt,
    })),
    comments: comments.map((c) => ({
      id: c.id,
      responseId: c.responseId,
      participantId: c.participantId,
      content: c.content,
      parentId: c.parentId,
      isHidden: c.isHidden,
      createdAt: c.createdAt,
    })),
    likes: likes.map((l) => ({
      id: l.id,
      responseId: l.responseId,
      participantId: l.participantId,
      type: l.type,
      createdAt: l.createdAt,
    })),
    points: session.points.map((pt) => ({
      id: pt.id,
      participantId: pt.participantId,
      teamId: pt.teamId,
      activityId: pt.activityId,
      responseId: pt.responseId,
      category: pt.category,
      amount: pt.amount,
      giverId: pt.giverId,
      reason: pt.reason,
      createdAt: pt.createdAt,
    })),
    scores,
    leaderboard,
    badges,
    timers,
    whiteboards: whiteboards.map((w) => ({
      id: w.id,
      activityId: w.activityId,
      participantId: w.participantId,
      teamId: w.teamId,
      sceneData: w.sceneData,
      isSubmitted: w.isSubmitted,
      submittedAt: w.submittedAt,
      createdAt: w.createdAt,
      updatedAt: w.updatedAt,
    })),
    events: session.events.map((e) => ({
      id: e.id,
      eventType: e.eventType,
      actorId: e.actorId,
      targetId: e.targetId,
      activityId: e.activityId,
      metadata: e.metadata,
      timestamp: e.timestamp,
    })),
  };
}

export async function concludeSession(sessionId: string) {
  return await prisma.$transaction(async (tx) => {
    const session = await tx.session.update({
      where: { id: sessionId },
      data: { status: "COMPLETED" },
    });

    // Conclude all active or draft activities
    await tx.activity.updateMany({
      where: {
        sessionId,
        state: { in: ["DRAFT", "ACTIVE", "LOCKED"] },
      },
      data: { state: "COMPLETED" },
    });

    await tx.event.create({
      data: {
        sessionId,
        eventType: "SESSION_ENDED",
        metadata: JSON.stringify({
          concludedAt: new Date().toISOString(),
        }),
      },
    });

    return session;
  });
}
