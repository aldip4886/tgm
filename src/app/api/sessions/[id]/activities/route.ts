import { NextRequest, NextResponse } from "next/server";
import { createActivity } from "@/services/activity.service";
import { prisma } from "@/lib/db";
import { z } from "zod";

const createActivitySchema = z.object({
  title: z.string().min(2, "Title is required"),
  prompt: z.string().min(3, "Prompt is required"),
  type: z.string().optional(),
  revealMode: z.enum(["UPON_LOCK", "IMMEDIATE"]).optional(),
  presentationSlide: z.number().int().positive().optional(),
  timerSeconds: z.number().int().positive().optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const activities = await prisma.activity.findMany({
      where: { sessionId: params.id },
      orderBy: { orderIndex: "asc" },
      include: {
        responses: {
          include: { participant: true },
        },
      },
    });
    return NextResponse.json(activities);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const validated = createActivitySchema.parse(body);
    const activity = await createActivity(params.id, validated);
    return NextResponse.json(activity, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to create activity" },
      { status: 400 }
    );
  }
}
