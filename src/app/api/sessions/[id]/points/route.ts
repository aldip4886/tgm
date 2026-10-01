import { NextRequest, NextResponse } from "next/server";
import { awardPoints, PointCategory } from "@/services/scoring.service";
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

    return NextResponse.json(point, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
