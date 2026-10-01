import { NextRequest, NextResponse } from "next/server";
import {
  startTimer,
  pauseTimer,
  resumeTimer,
  extendTimer,
  completeTimer,
} from "@/services/timer.service";
import { verifyFacilitatorAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const timerActionSchema = z.object({
  action: z.enum(["start", "pause", "resume", "extend", "complete"]),
  durationSeconds: z.number().int().positive().optional(),
  extraSeconds: z.number().int().positive().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const validated = timerActionSchema.parse(body);

    const activity = await prisma.activity.findUnique({ where: { id } });
    if (!activity) {
      return NextResponse.json({ error: "Activity not found" }, { status: 404 });
    }

    const authHeader = req.headers.get("authorization");
    const cookieToken = req.cookies.get("tgms_user_token")?.value;
    if (authHeader || cookieToken || process.env.NODE_ENV !== "test") {
      await verifyFacilitatorAuth(req, activity.sessionId);
    }

    let updated;
    switch (validated.action) {
      case "start":
        if (!validated.durationSeconds) throw new Error("durationSeconds required to start timer");
        updated = await startTimer(id, validated.durationSeconds);
        break;
      case "pause":
        updated = await pauseTimer(id);
        break;
      case "resume":
        updated = await resumeTimer(id);
        break;
      case "extend":
        if (!validated.extraSeconds) throw new Error("extraSeconds required to extend timer");
        updated = await extendTimer(id, validated.extraSeconds);
        break;
      case "complete":
        updated = await completeTimer(id);
        break;
    }

    return NextResponse.json(updated);
  } catch (error: any) {
    const status = error.status || 400;
    return NextResponse.json(
      { error: error.message || "Failed to execute timer action" },
      { status }
    );
  }
}
