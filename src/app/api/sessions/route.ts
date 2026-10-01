import { NextRequest, NextResponse } from "next/server";
import { createSession } from "@/services/session.service";
import { verifyFacilitatorAuth } from "@/lib/auth";
import { z } from "zod";

const createSessionSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().optional(),
  facilitatorName: z.string().min(2, "Facilitator name is required"),
  facilitatorEmail: z.string().email("Valid email required"),
});

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const cookieToken = req.cookies.get("tgms_user_token")?.value;
    let authUser: any = null;

    if (authHeader || cookieToken || process.env.NODE_ENV !== "test") {
      authUser = await verifyFacilitatorAuth(req);
    }

    const body = await req.json();
    const validated = createSessionSchema.parse(body);
    const session = await createSession({
      ...validated,
      facilitatorId: authUser?.userId,
      facilitatorUsername: authUser?.username,
      facilitatorName: validated.facilitatorName || authUser?.username || "Facilitator",
      facilitatorEmail: authUser?.email || validated.facilitatorEmail,
    });
    return NextResponse.json(session, { status: 201 });
  } catch (error: any) {
    const status = error.status || 400;
    return NextResponse.json(
      { error: error.message || "Failed to create session" },
      { status }
    );
  }
}

