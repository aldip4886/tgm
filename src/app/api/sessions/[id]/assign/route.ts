import { NextRequest, NextResponse } from "next/server";
import { assignUserToSession } from "@/services/user.service";
import { z } from "zod";

const assignSchema = z.object({
  userId: z.string().min(1),
  teamId: z.string().optional().nullable(),
  role: z.string().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;
    const body = await req.json();
    const data = assignSchema.parse(body);

    const result = await assignUserToSession({
      userId: data.userId,
      sessionId,
      teamId: data.teamId,
      role: data.role,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
