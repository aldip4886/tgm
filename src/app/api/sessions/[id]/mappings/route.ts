import { NextRequest, NextResponse } from "next/server";
import {
  createPresentationMapping,
  getPresentationMappings,
} from "@/services/presentation.service";
import { z } from "zod";

const mappingSchema = z.object({
  slideNumber: z.number().int().positive(),
  title: z.string().min(1, "Title is required"),
  checkpoint: z.string().optional(),
  activityId: z.string().optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const mappings = await getPresentationMappings(params.id);
    return NextResponse.json(mappings);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const validated = mappingSchema.parse(body);
    const mapping = await createPresentationMapping(params.id, validated);
    return NextResponse.json(mapping, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to create presentation mapping" },
      { status: 400 }
    );
  }
}
