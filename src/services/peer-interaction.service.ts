import { prisma } from "../lib/db";
import { evaluateAutomaticBadges } from "./badge.service";

export async function toggleReaction(
  responseId: string,
  participantId: string,
  type: string = "LIKE"
) {
  return await prisma.$transaction(async (tx) => {
    const existing = await tx.reaction.findUnique({
      where: {
        responseId_participantId_type: {
          responseId,
          participantId,
          type,
        },
      },
    });

    const response = await tx.response.findUnique({
      where: { id: responseId },
      include: { activity: true },
    });
    if (!response) throw new Error("Response not found");

    let reacted = false;
    if (existing) {
      await tx.reaction.delete({
        where: { id: existing.id },
      });
      await tx.event.create({
        data: {
          sessionId: response.activity.sessionId,
          activityId: response.activityId,
          actorId: participantId,
          targetId: responseId,
          eventType: "LIKE_REMOVED",
          metadata: JSON.stringify({ type }),
        },
      });
      reacted = false;
    } else {
      await tx.reaction.create({
        data: {
          responseId,
          participantId,
          type,
        },
      });
      await tx.event.create({
        data: {
          sessionId: response.activity.sessionId,
          activityId: response.activityId,
          actorId: participantId,
          targetId: responseId,
          eventType: "LIKE_ADDED",
          metadata: JSON.stringify({ type }),
        },
      });
      reacted = true;
    }

    const count = await tx.reaction.count({
      where: { responseId, type },
    });

    return { reacted, count };
  });
}

export async function createComment(
  responseId: string,
  participantId: string,
  content: string,
  parentId?: string
) {
  return await prisma.$transaction(async (tx) => {
    const response = await tx.response.findUnique({
      where: { id: responseId },
      include: { activity: true },
    });
    if (!response) throw new Error("Response not found");

    const comment = await tx.comment.create({
      data: {
        responseId,
        participantId,
        content: content.trim(),
        parentId,
      },
      include: {
        participant: true,
        response: {
          include: { participant: true },
        },
      },
    });

    await tx.event.create({
      data: {
        sessionId: response.activity.sessionId,
        activityId: response.activityId,
        actorId: participantId,
        targetId: comment.id,
        eventType: "COMMENT_CREATED",
        metadata: JSON.stringify({ parentId }),
      },
    });

    return comment;
  });
}

export async function deleteComment(
  commentId: string,
  actorId: string,
  isFacilitator: boolean = false
) {
  return await prisma.$transaction(async (tx) => {
    const comment = await tx.comment.findUnique({
      where: { id: commentId },
      include: { response: { include: { activity: true } } },
    });
    if (!comment) throw new Error("Comment not found");

    if (!isFacilitator && comment.participantId !== actorId) {
      throw new Error("Unauthorized to delete this comment");
    }

    const updated = await tx.comment.update({
      where: { id: commentId },
      data: { isHidden: true },
    });

    await tx.event.create({
      data: {
        sessionId: comment.response.activity.sessionId,
        activityId: comment.response.activityId,
        actorId,
        targetId: commentId,
        eventType: "COMMENT_DELETED",
      },
    });

    return updated;
  });
}

export async function awardPeerPoints(
  responseId: string,
  giverId: string,
  amount: number,
  reason?: string
) {
  if (amount <= 0) throw new Error("Amount must be positive");

  return await prisma.$transaction(async (tx) => {
    const response = await tx.response.findUnique({
      where: { id: responseId },
      include: { activity: true },
    });
    if (!response) throw new Error("Response not found");

    // Prevent self-awarding
    if (response.participantId === giverId) {
      throw new Error("Cannot award peer points to your own response");
    }

    const giver = await tx.sessionParticipant.findUnique({
      where: { id: giverId },
    });
    if (!giver) throw new Error("Giver participant profile not found");

    if (giver.peerPointBudget < amount) {
      throw new Error("Insufficient peer point budget");
    }

    // Deduct from giver's peer budget (ADR-0007)
    const updatedGiver = await tx.sessionParticipant.update({
      where: { id: giverId },
      data: { peerPointBudget: { decrement: amount } },
    });

    const recipient = await tx.sessionParticipant.findUnique({
      where: { id: response.participantId },
    });

    // Award point record in ledger (ADR-0011)
    const point = await tx.point.create({
      data: {
        sessionId: response.activity.sessionId,
        activityId: response.activityId,
        responseId,
        participantId: response.participantId,
        teamId: recipient?.teamId || null,
        category: "PEER",
        amount,
        giverId,
        reason: reason?.trim(),
      },
    });

    // Materialize totalPoints on recipient (ADR-0011)
    await tx.sessionParticipant.update({
      where: { id: response.participantId },
      data: { totalPoints: { increment: amount } },
    });

    if (recipient?.teamId) {
      await tx.team.update({
        where: { id: recipient.teamId },
        data: { totalPoints: { increment: amount } },
      });
    }

    await tx.event.create({
      data: {
        sessionId: response.activity.sessionId,
        activityId: response.activityId,
        actorId: giverId,
        targetId: point.id,
        eventType: "POINT_AWARDED",
        metadata: JSON.stringify({
          recipientId: response.participantId,
          amount,
          category: "PEER",
          reason,
        }),
      },
    });

    const newBadges = await evaluateAutomaticBadges(tx, response.activity.sessionId, response.participantId);

    return {
      point,
      giverName: giver.displayName,
      recipientId: response.participantId,
      recipientName: recipient?.displayName,
      remainingBudget: updatedGiver.peerPointBudget,
      newBadges,
    };
  });
}

export async function revokePoint(pointId: string, facilitatorId: string) {
  return await prisma.$transaction(async (tx) => {
    const point = await tx.point.findUnique({
      where: { id: pointId },
    });
    if (!point) throw new Error("Point record not found");

    // Decrement recipient's total score
    if (point.participantId) {
      await tx.sessionParticipant.update({
        where: { id: point.participantId },
        data: { totalPoints: { decrement: point.amount } },
      });
    }

    if (point.teamId) {
      await tx.team.update({
        where: { id: point.teamId },
        data: { totalPoints: { decrement: point.amount } },
      });
    }

    // If it was a peer point, refund giver's budget
    if (point.category === "PEER" && point.giverId) {
      await tx.sessionParticipant.update({
        where: { id: point.giverId },
        data: { peerPointBudget: { increment: point.amount } },
      });
    }

    // Delete point from ledger
    await tx.point.delete({ where: { id: pointId } });

    await tx.event.create({
      data: {
        sessionId: point.sessionId,
        activityId: point.activityId,
        actorId: facilitatorId,
        targetId: pointId,
        eventType: "POINT_REVOKED",
        metadata: JSON.stringify({ amount: point.amount, category: point.category }),
      },
    });

    return { success: true };
  });
}
