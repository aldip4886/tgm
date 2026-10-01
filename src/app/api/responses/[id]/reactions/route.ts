import { NextRequest, NextResponse } from "next/server";
import { toggleReaction } from "@/services/peer-interaction.service";
import { verifyParticipantToken } from "@/lib/auth";
import { z } from "zod";

const reactionSchema = z.object({
  type: z.string().default("LIKE"),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const token = authHeader.substring(7);
    const payload = await verifyParticipantToken(token);

    const body = await req.json().catch(() => ({}));
    const validated = reactionSchema.parse(body);

    const result = await toggleReaction(params.id, payload.participantId, validated.type);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to toggle reaction" },
      { status: 400 }
    );
  }
}
