import { NextRequest, NextResponse } from "next/server";
import { linkPresentation } from "@/services/presentation.service";
import { z } from "zod";

const linkSchema = z.object({
  canvaPresentationUrl: z.string().url("Valid URL required"),
  canvaSlideCount: z.number().int().positive().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const validated = linkSchema.parse(body);
    const updated = await linkPresentation(params.id, validated);
    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to link presentation" },
      { status: 400 }
    );
  }
}
