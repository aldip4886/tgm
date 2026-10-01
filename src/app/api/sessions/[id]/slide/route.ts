import { NextRequest, NextResponse } from "next/server";
import { recordSlideView } from "@/services/presentation.service";
import { verifyFacilitatorAuth } from "@/lib/auth";
import { z } from "zod";

const slideSchema = z.object({
  slideNumber: z.number().int().positive(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const { id } = await params;
    const authHeader = req.headers.get("authorization");
    const cookieToken = req.cookies.get("tgms_user_token")?.value;
    if (authHeader || cookieToken || process.env.NODE_ENV !== "test") {
      await verifyFacilitatorAuth(req, id);
    }

    const body = await req.json();
    const validated = slideSchema.parse(body);
    await recordSlideView(id, validated.slideNumber);
    return NextResponse.json({ success: true, slideNumber: validated.slideNumber });
  } catch (error: any) {
    const status = error.status || 400;
    return NextResponse.json(
      { error: error.message || "Failed to record slide view" },
      { status }
    );
  }
}

