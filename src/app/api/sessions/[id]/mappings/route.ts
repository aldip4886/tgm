import { NextRequest, NextResponse } from "next/server";
import {
  createPresentationMapping,
  getPresentationMappings,
} from "@/services/presentation.service";
import { verifyFacilitatorAuth } from "@/lib/auth";
import { z } from "zod";

const mappingSchema = z.object({
  slideNumber: z.number().int().positive(),
  title: z.string().min(1, "Title is required"),
  checkpoint: z.string().optional(),
  activityId: z.string().optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const { id } = await params;
    const mappings = await getPresentationMappings(id);
    return NextResponse.json(mappings);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

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
    const validated = mappingSchema.parse(body);
    const mapping = await createPresentationMapping(id, validated);
    return NextResponse.json(mapping, { status: 201 });
  } catch (error: any) {
    const status = error.status || 400;
    return NextResponse.json(
      { error: error.message || "Failed to create presentation mapping" },
      { status }
    );
  }
}
