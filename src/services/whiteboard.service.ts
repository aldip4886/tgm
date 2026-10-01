import { prisma } from "../lib/db";

export interface GetOrCreateWhiteboardInput {
  activityId: string;
  teamId?: string | null;
  participantId?: string | null;
  actorId?: string;
}

export async function getOrCreateWhiteboard(input: GetOrCreateWhiteboardInput) {
  const { activityId, actorId } = input;
  let { teamId, participantId } = input;

  return await prisma.$transaction(async (tx) => {
    const activity = await tx.activity.findUnique({
      where: { id: activityId },
      include: { session: true },
    });
    if (!activity) throw new Error("Activity not found");

    const effectiveParticipantId = participantId || actorId;
    let participant: any = null;
    if (effectiveParticipantId) {
      participant = await tx.sessionParticipant.findUnique({
        where: { id: effectiveParticipantId },
      });
    }

    const isFacilitator = actorId === activity.session.facilitatorId;

    if (activity.type === "WHITEBOARD_TEAM") {
      // Must be team-scoped
      if (!teamId && participant?.teamId) {
        teamId = participant.teamId;
      }
      if (!teamId && !isFacilitator) {
        throw new Error("Participant must belong to a team to access this team whiteboard");
      }
      if (participant && teamId && participant.teamId !== teamId && !isFacilitator) {
        throw new Error("Unauthorized: Only team members can access this team whiteboard");
      }
      participantId = null; // team whiteboards are shared across team members
    } else if (activity.type === "WHITEBOARD_INDIVIDUAL") {
      // Must be participant-scoped
      if (!participantId && effectiveParticipantId && participant) {
        participantId = participant.id;
      }
      if (!participantId && !isFacilitator) {
        throw new Error("Participant ID is required to access individual whiteboard");
      }
      teamId = null;
    } else if (activity.type === "WHITEBOARD_PUBLIC") {
      // Shared by everyone
      teamId = null;
      participantId = null;
    }

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
      include: { activity: { include: { session: true } } },
    });
    if (!wb) throw new Error("Whiteboard not found");

    if (actorId) {
      const isFacilitator = actorId === wb.activity.session.facilitatorId;
      if (!isFacilitator) {
        if (wb.activity.type === "WHITEBOARD_INDIVIDUAL" && wb.participantId && wb.participantId !== actorId) {
          throw new Error("Unauthorized: You can only edit your own individual whiteboard");
        }
        if (wb.activity.type === "WHITEBOARD_TEAM" && wb.teamId) {
          const participant = await tx.sessionParticipant.findUnique({ where: { id: actorId } });
          if (!participant || participant.teamId !== wb.teamId) {
            throw new Error("Unauthorized: Only team members can edit this team whiteboard");
          }
        }
      }
    }

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
      include: { activity: { include: { session: true } } },
    });
    if (!wb) throw new Error("Whiteboard not found");

    const isFacilitator = actorId === wb.activity.session.facilitatorId;
    if (!isFacilitator) {
      if (wb.activity.type === "WHITEBOARD_INDIVIDUAL" && wb.participantId && wb.participantId !== actorId) {
        throw new Error("Unauthorized: You can only submit your own individual whiteboard");
      }
      if (wb.activity.type === "WHITEBOARD_TEAM" && wb.teamId) {
        const participant = await tx.sessionParticipant.findUnique({ where: { id: actorId } });
        if (!participant || participant.teamId !== wb.teamId) {
          throw new Error("Unauthorized: Only team members can submit this team whiteboard");
        }
      }
    }

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
      include: { team: true, participant: true },
    });

    // Create or update a corresponding Response record so this whiteboard participates in peer interactions
    const effectiveAuthorId = wb.participantId || actorId;
    const existingResponse = await tx.response.findFirst({
      where: {
        activityId: wb.activityId,
        color: "WHITEBOARD",
        content: { contains: whiteboardId },
      },
    });

    const responseContent = JSON.stringify({
      type: "WHITEBOARD",
      whiteboardId: wb.id,
      title: updated.team?.name || updated.participant?.displayName || "Whiteboard Drawing",
    });

    if (existingResponse) {
      await tx.response.update({
        where: { id: existingResponse.id },
        data: {
          content: responseContent,
          updatedAt: new Date(),
        },
      });
    } else {
      await tx.response.create({
        data: {
          activityId: wb.activityId,
          participantId: effectiveAuthorId,
          teamId: wb.teamId || null,
          content: responseContent,
          color: "WHITEBOARD",
        },
      });
    }

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

export async function getWhiteboardById(whiteboardId: string, actorId?: string) {
  const wb = await prisma.whiteboard.findUnique({
    where: { id: whiteboardId },
    include: {
      activity: { include: { session: true } },
      team: {
        include: { members: true },
      },
      participant: true,
    },
  });
  if (!wb) return null;

  if (actorId) {
    const isFacilitator = actorId === wb.activity.session.facilitatorId;
    if (!isFacilitator) {
      // If whiteboard is submitted or public, session participants can view it to give feedback/points
      if (wb.isSubmitted || wb.activity.type === "WHITEBOARD_PUBLIC") {
        return wb;
      }
      if (wb.activity.type === "WHITEBOARD_INDIVIDUAL" && wb.participantId && wb.participantId !== actorId) {
        throw new Error("Unauthorized: Cannot view another participant's individual whiteboard");
      }
      if (wb.activity.type === "WHITEBOARD_TEAM" && wb.teamId) {
        const isMember = wb.team?.members.some((m) => m.id === actorId);
        if (!isMember) {
          throw new Error("Unauthorized: Cannot view another team's whiteboard");
        }
      }
    }
  }

  return wb;
}
