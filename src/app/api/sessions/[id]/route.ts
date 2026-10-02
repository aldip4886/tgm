import { NextRequest, NextResponse } from "next/server";
import {
  getSession,
  updateSession,
  deleteSession,
} from "@/services/session.service";
import { verifyFacilitatorAuth } from "@/lib/auth";
import { z } from "zod";

const updateSessionSchema = z.object({
  title: z.string().min(1, "Title cannot be empty").optional(),
  description: z.string().optional(),
  status: z.enum(["WAITING", "ACTIVE", "COMPLETED"]).optional(),
  canvaPresentationUrl: z.string().nullable().optional(),
  canvaSlideCount: z.number().int().min(1).nullable().optional(),
  leaderboardVisibility: z.enum(["HIDDEN", "LIVE", "END_OF_ACTIVITY"]).optional(),
  facilitatorId: z.string().optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const { id } = await params;
    const session = await getSession(id);
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // If an authenticated facilitator is making the request, verify they own the session
    const authHeader = req.headers.get("authorization");
    const cookieToken = req.cookies.get("tgms_user_token")?.value;
    if (authHeader || cookieToken) {
      try {
        await verifyFacilitatorAuth(req, id);
      } catch (authErr: any) {
        return NextResponse.json(
          { error: authErr.message || "Forbidden: You cannot access this session." },
          { status: authErr.status || 403 }
        );
      }
    }

    return NextResponse.json(session);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const { id } = await params;
    const payload = await verifyFacilitatorAuth(req, id);

    const body = await req.json();
    const validated = updateSessionSchema.parse(body);
    const updated = await updateSession(id, validated, payload.role, payload.userId);

    // Broadcast session update via Socket.IO if available
    try {
      const { getIO } = await import("@/lib/socket");
      const io = getIO();
      if (io) {
        io.to(`session:${id}`).emit("session:updated", { session: updated });
      }
    } catch {}

    return NextResponse.json(updated);
  } catch (error: any) {
    const status = error.status || (error.message?.includes("Forbidden") ? 403 : 400);
    return NextResponse.json(
      { error: error.message || "Failed to update session" },
      { status }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const { id } = await params;
    await verifyFacilitatorAuth(req, id);

    const result = await deleteSession(id);

    // Broadcast session deletion via Socket.IO if available
    try {
      const { getIO } = await import("@/lib/socket");
      const io = getIO();
      if (io) {
        io.to(`session:${id}`).emit("session:deleted", { sessionId: id });
      }
    } catch {}

    return NextResponse.json(result);
  } catch (error: any) {
    const status = error.status || 400;
    return NextResponse.json(
      { error: error.message || "Failed to delete session" },
      { status }
    );
  }
}
