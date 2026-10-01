import { prisma } from "../lib/db";
import { evaluateAutomaticBadges } from "./badge.service";

export interface CreateActivityInput {
  title: string;
  prompt: string;
  type?: string;
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

    await tx.event.create({
      data: {
        sessionId: activity.sessionId,
        activityId: activity.id,
        actorId: participantId,
        targetId: response.id,
        eventType: "RESPONSE_SUBMITTED",
        metadata: JSON.stringify({
          contentLength: response.content.length,
        }),
      },
    });

    const newBadges = await evaluateAutomaticBadges(tx, activity.sessionId, participantId);

    return {
      ...response,
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
