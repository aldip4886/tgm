import { NextRequest, NextResponse } from "next/server";
import {
  startTimer,
  pauseTimer,
  resumeTimer,
  extendTimer,
  completeTimer,
} from "@/services/timer.service";
import { z } from "zod";

const timerActionSchema = z.object({
  action: z.enum(["start", "pause", "resume", "extend", "complete"]),
  durationSeconds: z.number().int().positive().optional(),
  extraSeconds: z.number().int().positive().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const validated = timerActionSchema.parse(body);

    let updated;
    switch (validated.action) {
      case "start":
        if (!validated.durationSeconds) throw new Error("durationSeconds required to start timer");
        updated = await startTimer(params.id, validated.durationSeconds);
        break;
      case "pause":
        updated = await pauseTimer(params.id);
        break;
      case "resume":
        updated = await resumeTimer(params.id);
        break;
      case "extend":
        if (!validated.extraSeconds) throw new Error("extraSeconds required to extend timer");
        updated = await extendTimer(params.id, validated.extraSeconds);
        break;
      case "complete":
        updated = await completeTimer(params.id);
        break;
    }

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to execute timer action" },
      { status: 400 }
    );
  }
}
