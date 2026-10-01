import { NextRequest, NextResponse } from "next/server";
import {
  getOrCreateWhiteboard,
  getWhiteboardsForActivity,
} from "@/services/whiteboard.service";
import { z } from "zod";

const createSchema = z.object({
  teamId: z.string().optional().nullable(),
  participantId: z.string().optional().nullable(),
  actorId: z.string().optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: activityId } = await params;
    const { searchParams } = new URL(req.url);
    const teamId = searchParams.get("teamId");
    const participantId = searchParams.get("participantId");
    const isFacilitator = searchParams.get("isFacilitator") === "true";

    if (isFacilitator) {
      const whiteboards = await getWhiteboardsForActivity(activityId);
      return NextResponse.json(whiteboards);
    }

    const whiteboard = await getOrCreateWhiteboard({
      activityId,
      teamId: teamId || undefined,
      participantId: participantId || undefined,
    });

    return NextResponse.json(whiteboard);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: activityId } = await params;
    const body = await req.json();
    const data = createSchema.parse(body);

    const whiteboard = await getOrCreateWhiteboard({
      activityId,
      teamId: data.teamId,
      participantId: data.participantId,
      actorId: data.actorId,
    });

    return NextResponse.json(whiteboard, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
