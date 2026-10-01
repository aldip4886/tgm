import { NextRequest, NextResponse } from "next/server";
import { createComment } from "@/services/peer-interaction.service";
import { verifyParticipantToken } from "@/lib/auth";
import { z } from "zod";

const commentSchema = z.object({
  content: z.string().min(1, "Comment cannot be empty"),
  parentId: z.string().optional(),
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

    const body = await req.json();
    const validated = commentSchema.parse(body);

    const comment = await createComment(
      params.id,
      payload.participantId,
      validated.content,
      validated.parentId
    );

    try {
      const { getIO } = await import("@/lib/socket");
      const io = getIO();
      if (io && comment.response?.participantId) {
        if (comment.response.participantId !== payload.participantId) {
          const sessionId = comment.response.participant?.sessionId || payload.sessionId;
          io.to(`session:${sessionId}`).emit("comment:received_notification", {
            recipientId: comment.response.participantId,
            commenterName: comment.participant?.displayName || "A participant",
            content: comment.content,
            responseId: params.id,
          });
        }
      }
    } catch {}

    return NextResponse.json(comment, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to create comment" },
      { status: 400 }
    );
  }
}
