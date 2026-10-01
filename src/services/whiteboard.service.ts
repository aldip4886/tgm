import { prisma } from "../lib/db";

export interface GetOrCreateWhiteboardInput {
  activityId: string;
  teamId?: string | null;
  participantId?: string | null;
  actorId?: string;
}

export async function getOrCreateWhiteboard(input: GetOrCreateWhiteboardInput) {
  const { activityId, teamId, participantId, actorId } = input;

  return await prisma.$transaction(async (tx) => {
    const activity = await tx.activity.findUnique({
      where: { id: activityId },
    });
    if (!activity) throw new Error("Activity not found");

    let existing;
    if (teamId) {
      existing = await tx.whiteboard.findFirst({
        where: { activityId, teamId },
      });
    } else if (participantId) {
      existing = await tx.whiteboard.findFirst({
        where: { activityId, participantId },
      });
    } else {
      existing = await tx.whiteboard.findFirst({
        where: { activityId, teamId: null, participantId: null },
      });
    }

    if (existing) {
      if (actorId) {
        await tx.event.create({
          data: {
            sessionId: activity.sessionId,
            activityId,
            actorId,
            targetId: existing.id,
            eventType: "WHITEBOARD_OPENED",
            metadata: JSON.stringify({ whiteboardId: existing.id, teamId, participantId }),
          },
        });
      }
      return existing;
    }

    const defaultScene = JSON.stringify({ elements: [], appState: {} });

    const created = await tx.whiteboard.create({
      data: {
        activityId,
        teamId: teamId || null,
        participantId: participantId || null,
        sceneData: defaultScene,
        isSubmitted: false,
      },
    });

    await tx.event.create({
      data: {
        sessionId: activity.sessionId,
        activityId,
        actorId: actorId || null,
        targetId: created.id,
        eventType: "WHITEBOARD_OPENED",
        metadata: JSON.stringify({ whiteboardId: created.id, teamId, participantId }),
      },
    });

    return created;
  });
}

export async function saveWhiteboardScene(
  whiteboardId: string,
  sceneData: string,
  actorId?: string
) {
  return await prisma.$transaction(async (tx) => {
    const wb = await tx.whiteboard.findUnique({
      where: { id: whiteboardId },
      include: { activity: true },
    });
    if (!wb) throw new Error("Whiteboard not found");

    const updated = await tx.whiteboard.update({
      where: { id: whiteboardId },
      data: { sceneData },
    });

    await tx.event.create({
      data: {
        sessionId: wb.activity.sessionId,
        activityId: wb.activityId,
        actorId: actorId || null,
        targetId: whiteboardId,
        eventType: "WHITEBOARD_SAVED",
        metadata: JSON.stringify({ whiteboardId }),
      },
    });

    return updated;
  });
}

export async function submitWhiteboard(
  whiteboardId: string,
  actorId: string,
  sceneData?: string
) {
  return await prisma.$transaction(async (tx) => {
    const wb = await tx.whiteboard.findUnique({
      where: { id: whiteboardId },
      include: { activity: true },
    });
    if (!wb) throw new Error("Whiteboard not found");

    const updateData: any = {
      isSubmitted: true,
      submittedAt: new Date(),
    };
    if (sceneData) {
      updateData.sceneData = sceneData;
    }

    const updated = await tx.whiteboard.update({
      where: { id: whiteboardId },
      data: updateData,
    });

    await tx.event.create({
      data: {
        sessionId: wb.activity.sessionId,
        activityId: wb.activityId,
        actorId,
        targetId: whiteboardId,
        eventType: "WHITEBOARD_SUBMITTED",
        metadata: JSON.stringify({ whiteboardId }),
      },
    });

    return updated;
  });
}

export async function getWhiteboardsForActivity(activityId: string) {
  return await prisma.whiteboard.findMany({
    where: { activityId },
    include: {
      team: {
        include: { members: true },
      },
      participant: true,
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function getWhiteboardById(whiteboardId: string) {
  return await prisma.whiteboard.findUnique({
    where: { id: whiteboardId },
    include: {
      activity: true,
      team: {
        include: { members: true },
      },
      participant: true,
    },
  });
}
