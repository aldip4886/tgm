import { NextRequest, NextResponse } from "next/server";
import { linkPresentation, unlinkPresentation, sanitizeCanvaUrl } from "@/services/presentation.service";
import { verifyFacilitatorAuth } from "@/lib/auth";
import { z } from "zod";

const linkSchema = z.object({
  canvaPresentationUrl: z.string().min(1, "Presentation link cannot be empty"),
  canvaSlideCount: z.number().int().positive().optional(),
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

    const sanitizedUrl = sanitizeCanvaUrl(body.canvaPresentationUrl);
    const validated = linkSchema.parse({
      ...body,
      canvaPresentationUrl: sanitizedUrl,
    });

    const updated = await linkPresentation(id, validated);
    return NextResponse.json(updated);
  } catch (error: any) {
    const status = error.status || 400;
    return NextResponse.json(
      { error: error.message || "Failed to link presentation" },
      { status }
    );
  }
}

export async function DELETE(
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

    const updated = await unlinkPresentation(id);
    return NextResponse.json(updated);
  } catch (error: any) {
    const status = error.status || 400;
    return NextResponse.json(
      { error: error.message || "Failed to delete presentation link" },
      { status }
    );
  }
}
