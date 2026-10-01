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

    const response = NextResponse.json(result);
    if (result.userToken) {
      response.cookies.set("tgms_user_token", result.userToken, {
        httpOnly: false,
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
        sameSite: "lax",
      });
    }
    return response;
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 401 });
  }
}
