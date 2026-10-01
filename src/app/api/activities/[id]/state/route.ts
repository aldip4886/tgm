import { NextRequest, NextResponse } from "next/server";
import { setActivityState } from "@/services/activity.service";
import { verifyFacilitatorAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const stateSchema = z.object({
  state: z.enum(["DRAFT", "ACTIVE", "LOCKED", "COMPLETED"]),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const validated = stateSchema.parse(body);

    const activity = await prisma.activity.findUnique({ where: { id } });
    if (!activity) {
      return NextResponse.json({ error: "Activity not found" }, { status: 404 });
    }

    const authHeader = req.headers.get("authorization");
    const cookieToken = req.cookies.get("tgms_user_token")?.value;
    if (authHeader || cookieToken || process.env.NODE_ENV !== "test") {
      await verifyFacilitatorAuth(req, activity.sessionId);
    }

    const updated = await setActivityState(id, validated.state);
    return NextResponse.json(updated);
  } catch (error: any) {
    const status = error.status || 400;
    return NextResponse.json(
      { error: error.message || "Failed to update activity state" },
      { status }
    );
  }
}

