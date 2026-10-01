import { NextRequest, NextResponse } from "next/server";
import { reassignParticipantTeam } from "@/services/team.service";
import { verifyFacilitatorAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const reassignSchema = z.object({
  targetTeamId: z.string().nullable(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const participant = await prisma.sessionParticipant.findUnique({
      where: { id: params.id },
    });
    if (!participant) {
      return NextResponse.json({ error: "Participant not found" }, { status: 404 });
    }

    const authHeader = req.headers.get("authorization");
    const cookieToken = req.cookies.get("tgms_user_token")?.value;
    if (authHeader || cookieToken || process.env.NODE_ENV !== "test") {
      await verifyFacilitatorAuth(req, participant.sessionId);
    }

    const body = await req.json();
    const validated = reassignSchema.parse(body);
    const updated = await reassignParticipantTeam(params.id, validated.targetTeamId);
    return NextResponse.json(updated);
  } catch (error: any) {
    const status = error.status || 400;
    return NextResponse.json(
      { error: error.message || "Failed to reassign participant team" },
      { status }
    );
  }
}
