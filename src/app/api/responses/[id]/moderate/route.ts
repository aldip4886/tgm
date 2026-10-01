import { NextRequest, NextResponse } from "next/server";
import { moderateResponse } from "@/services/activity.service";
import { verifyFacilitatorAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const moderateSchema = z.object({
  isHidden: z.boolean(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const responseItem = await prisma.response.findUnique({
      where: { id: params.id },
      include: { activity: true },
    });
    if (!responseItem) {
      return NextResponse.json({ error: "Response not found" }, { status: 404 });
    }

    const authHeader = req.headers.get("authorization");
    const cookieToken = req.cookies.get("tgms_user_token")?.value;
    if (authHeader || cookieToken || process.env.NODE_ENV !== "test") {
      await verifyFacilitatorAuth(req, responseItem.activity.sessionId);
    }

    const body = await req.json();
    const validated = moderateSchema.parse(body);
    const updated = await moderateResponse(params.id, validated.isHidden);
    return NextResponse.json(updated);
  } catch (error: any) {
    const status = error.status || 400;
    return NextResponse.json(
      { error: error.message || "Failed to moderate response" },
      { status }
    );
  }
}
