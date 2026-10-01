import { NextRequest, NextResponse } from "next/server";
import { createSession } from "@/services/session.service";
import { z } from "zod";

const createSessionSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().optional(),
  facilitatorName: z.string().min(2, "Facilitator name is required"),
  facilitatorEmail: z.string().email("Valid email required"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = createSessionSchema.parse(body);
    const session = await createSession(validated);
    return NextResponse.json(session, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to create session" },
      { status: 400 }
    );
  }
}
