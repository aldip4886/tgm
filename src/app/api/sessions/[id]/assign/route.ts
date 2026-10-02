import { NextRequest, NextResponse } from "next/server";
import { assignUserToSession } from "@/services/user.service";
import { verifyFacilitatorAuth } from "@/lib/auth";
import { z } from "zod";

const assignSchema = z.object({
  userId: z.string().min(1),
  teamId: z.string().optional().nullable(),
  role: z.string().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const { id: sessionId } = await params;
    const authHeader = req.headers.get("authorization");
    const cookieToken = req.cookies.get("tgms_user_token")?.value;
    let actorRole: string | undefined;
    let actorUserId: string | undefined;

    if (authHeader || cookieToken || process.env.NODE_ENV !== "test") {
      const payload = await verifyFacilitatorAuth(req, sessionId);
      actorRole = payload.role;
      actorUserId = payload.userId;
    }

    const body = await req.json();
    const data = assignSchema.parse(body);

    const result = await assignUserToSession(
      {
        userId: data.userId,
        sessionId,
        teamId: data.teamId,
        role: data.role,
      },
      actorRole,
      actorUserId
    );

    return NextResponse.json(result, { status: 201 });
  } catch (err: any) {
    const status = err.status || (err.message?.includes("Forbidden") ? 403 : 400);
    return NextResponse.json({ error: err.message }, { status });
  }
}

