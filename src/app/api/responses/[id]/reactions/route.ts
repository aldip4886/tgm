import { NextRequest, NextResponse } from "next/server";
import { toggleReaction } from "@/services/peer-interaction.service";
import { verifyParticipantToken, verifyUserToken } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const reactionSchema = z.object({
  type: z.string().default("LIKE"),
  reason: z.string().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const responseId = resolvedParams.id;

    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const token = authHeader.substring(7);

    let participantId: string | null = null;
    try {
      const payload = await verifyParticipantToken(token);
      participantId = payload.participantId;
    } catch {
      const userPayload = await verifyUserToken(token);
      const targetResp = await prisma.response.findUnique({
        where: { id: responseId },
        include: { activity: true },
      });
      if (!targetResp) {
        return NextResponse.json({ error: "Response not found" }, { status: 404 });
      }
      const sessionId = targetResp.activity.sessionId;
      const displayName = `Facilitator (${userPayload.username})`;
      let facParticipant = await prisma.sessionParticipant.findFirst({
        where: {
          sessionId,
          OR: [{ userId: userPayload.userId }, { displayName }],
        },
      });
      if (!facParticipant) {
        facParticipant = await prisma.sessionParticipant.create({
          data: {
            sessionId,
            userId: userPayload.userId,
            displayName,
            role: "FACILITATOR",
            token: `fac_${sessionId}_${userPayload.userId}_${Date.now()}`,
            isConnected: true,
          },
        });
      }
      participantId = facParticipant.id;
    }

    const body = await req.json().catch(() => ({}));
    const validated = reactionSchema.parse(body);

    const result = await toggleReaction(
      responseId,
      participantId!,
      validated.type,
      validated.reason
    );

    try {
      const { getIO } = await import("@/lib/socket");
      const io = getIO();
      const sessionId = result.sessionId;
      if (io && sessionId) {
        io.to(`session:${sessionId}`).emit("presentation:chat_updated", {
          type: "INTERACTION_UPDATED",
          responseId,
        });
        if (result.reacted && result.recipientId && result.recipientId !== participantId) {
          io.to(`session:${sessionId}`).emit("like:received_notification", {
            notificationId: result.reactionId,
            recipientId: result.recipientId,
            giverName: result.giverName || "Facilitator",
            reason: result.reason || "Liked your submission!",
            responseId,
          });
        }
      }
    } catch {}

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to toggle reaction" },
      { status: 400 }
    );
  }
}

