import { NextRequest, NextResponse } from "next/server";
import { createUser, listUsers } from "@/services/user.service";
import { verifyUserToken } from "@/lib/auth";
import { z } from "zod";

const createUserSchema = z.object({
  username: z.string().min(2),
  password: z.string().min(4),
  name: z.string().min(1),
  email: z.string().email().optional().or(z.literal("")),
  role: z.enum(["PARTICIPANT", "FACILITATOR", "ADMIN", "SUPER_ADMIN"]).optional(),
});

export async function GET() {
  try {
    const users = await listUsers();
    return NextResponse.json(users);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    let actorRole: string | undefined;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      try {
        const payload = await verifyUserToken(authHeader.substring(7));
        actorRole = payload.role;
      } catch {}
    }

    const body = await req.json();
    const data = createUserSchema.parse(body);

    const user = await createUser(
      {
        username: data.username,
        password: data.password,
        name: data.name,
        email: data.email || undefined,
        role: data.role,
      },
      actorRole
    );

    return NextResponse.json(user, { status: 201 });
  } catch (err: any) {
    const status = err.message?.includes("Forbidden") ? 403 : 400;
    return NextResponse.json({ error: err.message }, { status });
  }
}
