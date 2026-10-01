import { NextRequest, NextResponse } from "next/server";
import { joinSession } from "@/services/session.service";
import { z } from "zod";

const joinSchema = z.object({
  code: z.string().min(4, "Session code is required"),
  displayName: z.string().min(2, "Display name must be at least 2 characters"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = joinSchema.parse(body);
    const result = await joinSession(validated);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to join session" },
      { status: 400 }
    );
  }
}
