import { NextRequest, NextResponse } from "next/server";
import { recordSlideView } from "@/services/presentation.service";
import { z } from "zod";

const slideSchema = z.object({
  slideNumber: z.number().int().positive(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const validated = slideSchema.parse(body);
    await recordSlideView(params.id, validated.slideNumber);
    return NextResponse.json({ success: true, slideNumber: validated.slideNumber });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to record slide view" },
      { status: 400 }
    );
  }
}
