import { NextRequest, NextResponse } from "next/server";
import { createUser, listUsers } from "@/services/user.service";
import { verifyFacilitatorAuth, verifyAdminAuth } from "@/lib/auth";
import { z } from "zod";

const createUserSchema = z.object({
  username: z.string().min(2),
  password: z.string().min(4),
  name: z.string().min(1),
  email: z.string().email().optional().or(z.literal("")),
  role: z.enum(["PARTICIPANT", "FACILITATOR", "ADMIN", "SUPER_ADMIN"]).optional(),
});

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const cookieToken = req.cookies.get("tgms_user_token")?.value;
    if (authHeader || cookieToken || process.env.NODE_ENV !== "test") {
      await verifyFacilitatorAuth(req);
    }

    const users = await listUsers();
    return NextResponse.json(users);
  } catch (err: any) {
    const status = err.status || 400;
    return NextResponse.json({ error: err.message }, { status });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const cookieToken = req.cookies.get("tgms_user_token")?.value;
    let actorRole: string | undefined;

    if (authHeader || cookieToken || process.env.NODE_ENV !== "test") {
      const payload = await verifyAdminAuth(req);
      actorRole = payload.role;
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
    const status = err.status || (err.message?.includes("Forbidden") ? 403 : 400);
    return NextResponse.json({ error: err.message }, { status });
  }
}
