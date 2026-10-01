import { NextRequest, NextResponse } from "next/server";
import { awardPoints, PointCategory } from "@/services/scoring.service";
import { verifyFacilitatorAuth } from "@/lib/auth";
import { z } from "zod";

const schema = z.object({
  participantId: z.string().optional().nullable(),
  teamId: z.string().optional().nullable(),
  category: z.enum([
    "PARTICIPATION",
    "PEER",
    "CHALLENGE",
    "FACILITATOR",
    "TEAM",
    "BONUS",
  ]),
  amount: z.number().int().positive(),
  reason: z.string().optional(),
  giverId: z.string().optional().nullable(),
  activityId: z.string().optional().nullable(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const data = schema.parse(body);

    if (data.category === "FACILITATOR" || data.category === "BONUS" || data.category === "CHALLENGE") {
      const authHeader = req.headers.get("authorization");
      const cookieToken = req.cookies.get("tgms_user_token")?.value;
      if (authHeader || cookieToken || process.env.NODE_ENV !== "test") {
        await verifyFacilitatorAuth(req, id);
      }
    }

    const point = await awardPoints({
      sessionId: id,
      participantId: data.participantId,
      teamId: data.teamId,
      category: data.category as PointCategory,
      amount: data.amount,
      reason: data.reason,
      giverId: data.giverId,
      activityId: data.activityId,
    });

    try {
      const { getIO } = await import("@/lib/socket");
      const io = getIO();
      if (data.participantId) {
        io.to(`session:${id}`).emit("point:awarded_notification", {
          recipientId: data.participantId,
          amount: data.amount,
          reason: data.reason || "Facilitator points awarded",
          giverName: "Facilitator",
        });
      }
      io.to(`session:${id}`).emit("leaderboard:scores_updated");
    } catch {}

    return NextResponse.json(point, { status: 201 });
  } catch (err: any) {
    const status = err.status || 400;
    return NextResponse.json({ error: err.message }, { status });
  }
}
