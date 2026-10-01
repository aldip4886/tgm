import { NextRequest, NextResponse } from "next/server";
import { toggleReaction } from "@/services/peer-interaction.service";
import { verifyParticipantToken } from "@/lib/auth";
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
    const payload = await verifyParticipantToken(token);

    const body = await req.json().catch(() => ({}));
    const validated = reactionSchema.parse(body);

    const result = await toggleReaction(
      responseId,
      payload.participantId,
      validated.type,
      validated.reason
    );

    if (result.reacted && result.recipientId && result.recipientId !== payload.participantId) {
      try {
        const { getIO } = await import("@/lib/socket");
        const io = getIO();
        const sessionId = result.sessionId || payload.sessionId;
        io.to(`session:${sessionId}`).emit("like:received_notification", {
          notificationId: result.reactionId,
          recipientId: result.recipientId,
          giverName: result.giverName || payload.displayName || "A peer",
          reason: result.reason || "Liked your submission!",
          responseId,
        });
      } catch {}
    }

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to toggle reaction" },
      { status: 400 }
    );
  }
}
