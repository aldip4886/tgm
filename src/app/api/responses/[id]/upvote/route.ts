import { NextRequest, NextResponse } from "next/server";
import { upvoteQAQuestion } from "@/services/activity.service";
import { verifyParticipantToken } from "@/lib/auth";
import { z } from "zod";

const upvoteSchema = z.object({
  participantId: z.string().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const { id: responseId } = await params;
    let participantId: string | undefined;

    const authHeader = req.headers.get("authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      try {
        const payload = await verifyParticipantToken(authHeader.substring(7));
        participantId = payload.participantId;
      } catch {}
    }

    if (!participantId) {
      try {
        const body = await req.json();
        const data = upvoteSchema.parse(body);
        participantId = data.participantId;
      } catch {}
    }

    if (!participantId) {
      return NextResponse.json(
        { error: "Participant authentication required to upvote" },
        { status: 401 }
      );
    }

    const result = await upvoteQAQuestion(responseId, participantId);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
