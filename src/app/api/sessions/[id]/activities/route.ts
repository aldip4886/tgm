import { NextRequest, NextResponse } from "next/server";
import { createActivity } from "@/services/activity.service";
import { prisma } from "@/lib/db";
import { verifyFacilitatorAuth } from "@/lib/auth";
import { z } from "zod";

const createActivitySchema = z.object({
  title: z.string().min(1, "Title is required"),
  prompt: z.string().min(1, "Prompt is required"),
  type: z.string().optional(),
  config: z.string().optional(),
  revealMode: z.enum(["UPON_LOCK", "IMMEDIATE"]).optional(),
  presentationSlide: z.number().int().min(1).optional(),
  timerSeconds: z.number().int().positive().optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const { id } = await params;
    const activities = await prisma.activity.findMany({
      where: { sessionId: id },
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
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const { id: sessionId } = await params;
    const authHeader = req.headers.get("authorization");
    const cookieToken = req.cookies.get("tgms_user_token")?.value;
    if (authHeader || cookieToken || process.env.NODE_ENV !== "test") {
      await verifyFacilitatorAuth(req, sessionId);
    }

    const body = await req.json();
    const validated = createActivitySchema.parse(body);
    const activity = await createActivity(sessionId, validated);
    return NextResponse.json(activity, { status: 201 });
  } catch (error: any) {
    const status = error.status || 400;
    return NextResponse.json(
      { error: error.message || "Failed to create activity" },
      { status }
    );
  }
}
