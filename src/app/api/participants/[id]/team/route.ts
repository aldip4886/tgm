import { NextRequest, NextResponse } from "next/server";
import { reassignParticipantTeam } from "@/services/team.service";
import { z } from "zod";

const reassignSchema = z.object({
  targetTeamId: z.string().nullable(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const validated = reassignSchema.parse(body);
    const updated = await reassignParticipantTeam(params.id, validated.targetTeamId);
    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to reassign participant team" },
      { status: 400 }
    );
  }
}
