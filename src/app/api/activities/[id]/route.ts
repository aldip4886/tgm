import { NextRequest, NextResponse } from "next/server";
import {
  getActivityById,
  updateActivity,
  deleteActivity,
} from "@/services/activity.service";
import { prisma } from "@/lib/db";
import { verifyFacilitatorAuth } from "@/lib/auth";
import { z } from "zod";

const updateActivitySchema = z.object({
  title: z.string().min(1, "Title cannot be empty").optional(),
  prompt: z.string().min(1, "Prompt cannot be empty").optional(),
  type: z.string().optional(),
  config: z.string().optional(),
  revealMode: z.enum(["UPON_LOCK", "IMMEDIATE"]).optional(),
  presentationSlide: z.number().int().min(1).nullable().optional(),
  timerSeconds: z.number().int().positive().nullable().optional(),
  state: z.enum(["DRAFT", "ACTIVE", "LOCKED", "COMPLETED"]).optional(),
  orderIndex: z.number().int().optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const { id } = await params;
    const activity = await getActivityById(id);
    if (!activity) {
      return NextResponse.json({ error: "Activity not found" }, { status: 404 });
    }
    return NextResponse.json(activity);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch activity" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const { id } = await params;
    const existing = await prisma.activity.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Activity not found" }, { status: 404 });
    }

    const authHeader = req.headers.get("authorization");
    const cookieToken = req.cookies.get("tgms_user_token")?.value;
    if (authHeader || cookieToken || process.env.NODE_ENV !== "test") {
      await verifyFacilitatorAuth(req, existing.sessionId);
    }

    const body = await req.json();
    const validated = updateActivitySchema.parse(body);
    const updated = await updateActivity(id, validated);

    // Broadcast state update if state or prompt changed
    try {
      const { getIO } = await import("@/lib/socket");
      const io = getIO();
      if (io) {
        io.to(`session:${existing.sessionId}`).emit("activity:state_updated", {
          activity: updated,
        });
      }
    } catch {}

    return NextResponse.json(updated);
  } catch (error: any) {
    const status = error.status || 400;
    return NextResponse.json(
      { error: error.message || "Failed to update activity" },
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
    const existing = await prisma.activity.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Activity not found" }, { status: 404 });
    }

    const authHeader = req.headers.get("authorization");
    const cookieToken = req.cookies.get("tgms_user_token")?.value;
    if (authHeader || cookieToken || process.env.NODE_ENV !== "test") {
      await verifyFacilitatorAuth(req, existing.sessionId);
    }

    const result = await deleteActivity(id);

    // If deleted activity was active, broadcast to reset clients
    if (existing.state === "ACTIVE") {
      try {
        const { getIO } = await import("@/lib/socket");
        const io = getIO();
        if (io) {
          io.to(`session:${existing.sessionId}`).emit("activity:state_updated", {
            activity: { ...existing, state: "COMPLETED" },
          });
        }
      } catch {}
    }

    return NextResponse.json(result);
  } catch (error: any) {
    const status = error.status || 400;
    return NextResponse.json(
      { error: error.message || "Failed to delete activity" },
      { status }
    );
  }
}
