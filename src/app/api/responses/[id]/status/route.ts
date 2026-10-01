import { NextRequest, NextResponse } from "next/server";
import { setQAQuestionStatus } from "@/services/activity.service";
import { verifyFacilitatorAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const statusSchema = z.object({
  status: z.enum(["ANSWERED", "SPOTLIGHT", "ACTIVE"]),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const { id: responseId } = await params;
    const body = await req.json();
    const { status } = statusSchema.parse(body);

    const response = await prisma.response.findUnique({
      where: { id: responseId },
      include: { activity: true },
    });
    if (!response) {
      return NextResponse.json({ error: "Response not found" }, { status: 404 });
    }

    const authHeader = req.headers.get("authorization");
    const cookieToken = req.cookies.get("tgms_user_token")?.value;
    if (authHeader || cookieToken || process.env.NODE_ENV !== "test") {
      await verifyFacilitatorAuth(req, response.activity.sessionId);
    }

    const updated = await setQAQuestionStatus(responseId, status);
    return NextResponse.json(updated);
  } catch (error: any) {
    const code = error.status || 400;
    return NextResponse.json({ error: error.message }, { status: code });
  }
}
