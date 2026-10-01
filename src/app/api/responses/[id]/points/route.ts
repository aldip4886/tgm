import { NextRequest, NextResponse } from "next/server";
import { awardPeerPoints } from "@/services/peer-interaction.service";
import { verifyParticipantToken } from "@/lib/auth";
import { z } from "zod";

const pointSchema = z.object({
  amount: z.number().int().positive().default(1),
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

    const body = await req.json();
    const validated = pointSchema.parse(body);

    const result = await awardPeerPoints(
      responseId,
      payload.participantId,
      validated.amount,
      validated.reason
    );

    try {
      const { getIO } = await import("@/lib/socket");
      const io = getIO();
      io.to(`session:${result.point.sessionId}`).emit("point:awarded_notification", {
        notificationId: result.point.id,
        recipientId: result.recipientId,
        amount: validated.amount,
        reason: validated.reason,
        giverName: result.giverName,
      });
      io.to(`session:${result.point.sessionId}`).emit("leaderboard:scores_updated");
    } catch {}

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to award peer points" },
      { status: 400 }
    );
  }
}
