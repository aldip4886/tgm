import { NextRequest, NextResponse } from "next/server";
import { setLeaderboardVisibility } from "@/services/scoring.service";
import { z } from "zod";

const schema = z.object({
  visibility: z.enum(["HIDDEN", "LIVE", "END_OF_ACTIVITY"]),
  actorId: z.string().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const data = schema.parse(body);

    const updated = await setLeaderboardVisibility(id, data.visibility, data.actorId);

    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
