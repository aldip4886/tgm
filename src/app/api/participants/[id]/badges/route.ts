import { NextRequest, NextResponse } from "next/server";
import {
  getBadgesForParticipant,
  awardManualBadge,
} from "@/services/badge.service";
import { z } from "zod";

const awardSchema = z.object({
  sessionId: z.string(),
  badgeId: z.string(),
  facilitatorId: z.string(),
  reason: z.string().optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: participantId } = await params;
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId");

    if (!sessionId) {
      return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
    }

    const badges = await getBadgesForParticipant(sessionId, participantId);
    return NextResponse.json(badges);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: participantId } = await params;
    const body = await req.json();
    const data = awardSchema.parse(body);

    const awarded = await awardManualBadge({
      sessionId: data.sessionId,
      participantId,
      badgeId: data.badgeId,
      facilitatorId: data.facilitatorId,
      reason: data.reason,
    });

    return NextResponse.json(awarded, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
