import { NextRequest, NextResponse } from "next/server";
import { authenticateUser } from "@/services/user.service";
import { z } from "zod";

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
  sessionCode: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = loginSchema.parse(body);

    const result = await authenticateUser({
      username: data.username,
      password: data.password,
      sessionCode: data.sessionCode,
    });

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 401 });
  }
}
