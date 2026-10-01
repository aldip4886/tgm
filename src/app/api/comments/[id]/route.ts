import { NextRequest, NextResponse } from "next/server";
import { deleteComment } from "@/services/peer-interaction.service";
import { verifyParticipantToken } from "@/lib/auth";

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const isFacilitator = req.nextUrl.searchParams.get("isFacilitator") === "true";
    let actorId = "FACILITATOR";

    const authHeader = req.headers.get("authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      try {
        const token = authHeader.substring(7);
        const payload = await verifyParticipantToken(token);
        actorId = payload.participantId;
      } catch {}
    }

    const updated = await deleteComment(params.id, actorId, isFacilitator);
    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to delete comment" },
      { status: 400 }
    );
  }
}
