import { prisma } from "../lib/db";
import { evaluateAutomaticBadges } from "./badge.service";

export interface CreateActivityInput {
  title: string;
  prompt: string;
  type?: string;
  config?: string;
  revealMode?: string;
  presentationSlide?: number;
  timerSeconds?: number;
}

export async function createActivity(sessionId: string, input: CreateActivityInput) {
  return await prisma.$transaction(async (tx) => {
    // Get highest orderIndex
    const last = await tx.activity.findFirst({
      where: { sessionId },
      orderBy: { orderIndex: "desc" },
    });
    const orderIndex = last ? last.orderIndex + 1 : 1;

    const activity = await tx.activity.create({
      data: {
        sessionId,
        title: input.title.trim(),
        prompt: input.prompt.trim(),
        type: input.type || "OPEN_QUESTION",
        config: input.config || null,
        revealMode: input.revealMode || "UPON_LOCK",
        presentationSlide: input.presentationSlide,
        timerSeconds: input.timerSeconds,
        state: "DRAFT",
        orderIndex,
      },
    });

    await tx.event.create({
      data: {
        sessionId,
        activityId: activity.id,
        eventType: "ACTIVITY_CREATED",
        metadata: JSON.stringify({
          title: activity.title,
          type: activity.type,
          revealMode: activity.revealMode,
        }),
      },
    });

    return activity;
  });
}

export async function setActivityState(
  activityId: string,
  state: "DRAFT" | "ACTIVE" | "LOCKED" | "COMPLETED"
) {
  return await prisma.$transaction(async (tx) => {
    const activity = await tx.activity.findUnique({
      where: { id: activityId },
    });
    if (!activity) throw new Error("Activity not found");

    // ADR-0005: Strict Single-Active Linear Activity Lifecycle
    // Activating a new activity automatically marks any other active activity as COMPLETED
    if (state === "ACTIVE") {
      await tx.activity.updateMany({
        where: {
          sessionId: activity.sessionId,
          state: "ACTIVE",
          id: { not: activityId },
        },
        data: { state: "COMPLETED" },
      });
    }

    const updated = await tx.activity.update({
      where: { id: activityId },
      data: { state },
    });

    const eventType =
      state === "ACTIVE"
        ? "ACTIVITY_ACTIVATED"
        : state === "LOCKED"
        ? "ACTIVITY_LOCKED"
        : state === "COMPLETED"
        ? "ACTIVITY_COMPLETED"
        : "ACTIVITY_UPDATED";

    await tx.event.create({
      data: {
        sessionId: activity.sessionId,
        activityId: activity.id,
        eventType,
        metadata: JSON.stringify({ state }),
      },
    });

    return updated;
  });
}

export interface SubmitResponseInput {
  content: string;
  color?: string;
  teamId?: string;
}

export async function submitResponse(
  activityId: string,
  participantId: string,
  input: SubmitResponseInput
) {
  return await prisma.$transaction(async (tx) => {
    const activity = await tx.activity.findUnique({
      where: { id: activityId },
    });
    if (!activity) throw new Error("Activity not found");

    if (activity.state !== "ACTIVE") {
      throw new Error("Activity is not active for submissions");
    }

    // Single-response enforcement for POLL, QUIZ, RANKING
    if (activity.type === "POLL" || activity.type === "QUIZ" || activity.type === "RANKING") {
      const existing = await tx.response.findFirst({
        where: { activityId, participantId },
      });
      if (existing) {
        if (activity.type === "QUIZ") {
          throw new Error("You have already submitted an answer for this quiz");
        }
        // For POLL or RANKING, allow updating their selection
        const updated = await tx.response.update({
          where: { id: existing.id },
          data: {
            content: input.content.trim(),
            color: input.color,
          },
          include: { participant: true },
        });
        return { ...updated, newBadges: [] };
      }
    }

    const response = await tx.response.create({
      data: {
        activityId,
        participantId,
        teamId: input.teamId,
        content: input.content.trim(),
        color: input.color,
      },
      include: {
        participant: true,
      },
    });

    // Check if QUIZ: evaluate correctness and award points
    let isCorrectAnswer = false;
    let quizAwardedPoints = 0;
    if (activity.type === "QUIZ" && activity.config) {
      try {
        const parsed = JSON.parse(activity.config);
        const correctAnswer = parsed.correctAnswer;
        const options: string[] = parsed.options || [];
        const awardedPts = Number(parsed.points) || 10;
        const submitted = input.content.trim();

        if (
          String(correctAnswer) === submitted ||
          (typeof correctAnswer === "number" && options[correctAnswer] === submitted) ||
          (typeof correctAnswer === "string" && options[Number(correctAnswer)] === submitted)
        ) {
          isCorrectAnswer = true;
          quizAwardedPoints = awardedPts;

          await tx.point.create({
            data: {
              sessionId: activity.sessionId,
              participantId,
              teamId: input.teamId,
              activityId: activity.id,
              responseId: response.id,
              category: "CHALLENGE",
              amount: awardedPts,
              reason: `Correct answer in Quiz: "${activity.title}"`,
            },
          });

          await tx.sessionParticipant.update({
            where: { id: participantId },
            data: { totalPoints: { increment: awardedPts } },
          });

          if (input.teamId) {
            await tx.team.update({
              where: { id: input.teamId },
              data: { totalPoints: { increment: awardedPts } },
            });
          }
        }
      } catch (err) {
        console.error("Error evaluating quiz response:", err);
      }
    }

    await tx.event.create({
      data: {
        sessionId: activity.sessionId,
        activityId: activity.id,
        actorId: participantId,
        targetId: response.id,
        eventType: "RESPONSE_SUBMITTED",
        metadata: JSON.stringify({
          contentLength: response.content.length,
          type: activity.type,
          isCorrectAnswer,
          quizAwardedPoints,
        }),
      },
    });

    const newBadges = await evaluateAutomaticBadges(tx, activity.sessionId, participantId);

    return {
      ...response,
      isCorrectAnswer,
      quizAwardedPoints,
      newBadges,
    };
  });
}

export async function getResponses(
  activityId: string,
  participantId?: string,
  isFacilitator: boolean = false
) {
  const activity = await prisma.activity.findUnique({
    where: { id: activityId },
  });
  if (!activity) throw new Error("Activity not found");

  const whereClause: any = { activityId };

  if (!isFacilitator) {
    whereClause.isHidden = false;

    // ADR-0012: Reveal Mode Logic
    // In UPON_LOCK mode while ACTIVE, participants only see their own response
    if (activity.revealMode === "UPON_LOCK" && activity.state === "ACTIVE") {
      if (!participantId) return [];
      whereClause.participantId = participantId;
    }
  }

  return await prisma.response.findMany({
    where: whereClause,
    include: {
      participant: true,
      reactions: true,
      comments: {
        where: isFacilitator ? {} : { isHidden: false },
        include: { participant: true },
        orderBy: { createdAt: "asc" },
      },
      points: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function moderateResponse(responseId: string, isHidden: boolean) {
  return await prisma.$transaction(async (tx) => {
    const response = await tx.response.update({
      where: { id: responseId },
      data: { isHidden },
      include: { activity: true },
    });

    await tx.event.create({
      data: {
        sessionId: response.activity.sessionId,
        activityId: response.activityId,
        targetId: responseId,
        eventType: isHidden ? "RESPONSE_HIDDEN" : "RESPONSE_UNHIDDEN",
      },
    });

    return response;
  });
}

// ----------------- Interaction Aggregators & Helpers -----------------

export async function getPollResults(activityId: string) {
  const activity = await prisma.activity.findUnique({
    where: { id: activityId },
    include: { responses: true },
  });
  if (!activity) throw new Error("Activity not found");

  let options: string[] = [];
  let correctAnswer: number | string | undefined;
  if (activity.config) {
    try {
      const cfg = JSON.parse(activity.config);
      options = cfg.options || [];
      correctAnswer = cfg.correctAnswer;
    } catch {}
  }

  const counts: Record<string, number> = {};
  for (const opt of options) {
    counts[opt] = 0;
  }

  let totalVotes = 0;
  for (const r of activity.responses) {
    if (!r.isHidden) {
      counts[r.content] = (counts[r.content] || 0) + 1;
      totalVotes++;
    }
  }

  return {
    options,
    counts,
    totalVotes,
    correctAnswer,
  };
}

export async function getWordCloudResults(activityId: string) {
  const responses = await prisma.response.findMany({
    where: { activityId, isHidden: false },
  });

  const frequencyMap: Record<string, number> = {};
  let totalWords = 0;

  for (const r of responses) {
    // Split into tokens / phrases
    const tokens = r.content
      .split(/[,;\n]+/)
      .map((t) => t.trim().toLowerCase())
      .filter((t) => t.length > 0 && t.length <= 40);

    for (const token of tokens) {
      frequencyMap[token] = (frequencyMap[token] || 0) + 1;
      totalWords++;
    }
  }

  const words = Object.entries(frequencyMap)
    .map(([text, count]) => ({ text, count }))
    .sort((a, b) => b.count - a.count);

  return { words, totalWords };
}

export async function getQAResults(activityId: string, currentParticipantId?: string) {
  const responses = await prisma.response.findMany({
    where: { activityId, isHidden: false },
    include: {
      participant: true,
      reactions: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const questions = responses.map((r) => {
    const upvotes = r.reactions.filter((rx) => rx.type === "UPVOTE" || rx.type === "LIKE").length;
    const hasUpvoted = currentParticipantId
      ? r.reactions.some(
          (rx) =>
            rx.participantId === currentParticipantId &&
            (rx.type === "UPVOTE" || rx.type === "LIKE")
        )
      : false;
    const isAnonymous = r.color === "ANONYMOUS";
    const status = r.color === "ANSWERED" ? "ANSWERED" : r.color === "SPOTLIGHT" ? "SPOTLIGHT" : "ACTIVE";

    return {
      id: r.id,
      question: r.content,
      isAnonymous,
      authorName: isAnonymous ? "Anonymous" : r.participant.displayName,
      participantId: r.participantId,
      upvotes,
      hasUpvoted,
      status,
      createdAt: r.createdAt,
    };
  });

  // Sort by spotlight first, then highest upvotes, then recency
  questions.sort((a, b) => {
    if (a.status === "SPOTLIGHT" && b.status !== "SPOTLIGHT") return -1;
    if (b.status === "SPOTLIGHT" && a.status !== "SPOTLIGHT") return 1;
    if (b.upvotes !== a.upvotes) return b.upvotes - a.upvotes;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return questions;
}

export async function upvoteQAQuestion(responseId: string, participantId: string) {
  return await prisma.$transaction(async (tx) => {
    const existing = await tx.reaction.findUnique({
      where: {
        responseId_participantId_type: {
          responseId,
          participantId,
          type: "UPVOTE",
        },
      },
    });

    if (existing) {
      await tx.reaction.delete({
        where: { id: existing.id },
      });
      return { upvoted: false };
    } else {
      await tx.reaction.create({
        data: {
          responseId,
          participantId,
          type: "UPVOTE",
        },
      });
      return { upvoted: true };
    }
  });
}

export async function setQAQuestionStatus(
  responseId: string,
  status: "ANSWERED" | "SPOTLIGHT" | "ACTIVE"
) {
  const color = status === "ACTIVE" ? null : status;
  return await prisma.response.update({
    where: { id: responseId },
    data: { color },
  });
}

export async function getRankingResults(activityId: string) {
  const activity = await prisma.activity.findUnique({
    where: { id: activityId },
    include: { responses: { where: { isHidden: false } } },
  });
  if (!activity) throw new Error("Activity not found");

  let items: string[] = [];
  if (activity.config) {
    try {
      const cfg = JSON.parse(activity.config);
      items = cfg.items || [];
    } catch {}
  }

  const scores: Record<string, number> = {};
  for (const it of items) scores[it] = 0;

  // Borda Count: If N items, 1st place gets N points, 2nd gets N-1, ..., last gets 1 point
  const n = items.length;
  let totalSubmissions = 0;

  for (const r of activity.responses) {
    try {
      const ranked: string[] = JSON.parse(r.content);
      if (Array.isArray(ranked)) {
        totalSubmissions++;
        ranked.forEach((item, index) => {
          const points = Math.max(1, n - index);
          scores[item] = (scores[item] || 0) + points;
        });
      }
    } catch {}
  }

  const rankedItems = items
    .map((item) => ({ item, score: scores[item] || 0 }))
    .sort((a, b) => b.score - a.score)
    .map((entry, index) => ({ ...entry, rank: index + 1 }));

  return { rankedItems, totalSubmissions };
}

