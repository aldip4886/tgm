import { NextRequest, NextResponse } from "next/server";
import { moderateResponse } from "@/services/activity.service";
import { z } from "zod";

const moderateSchema = z.object({
  isHidden: z.boolean(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const validated = moderateSchema.parse(body);
    const updated = await moderateResponse(params.id, validated.isHidden);
    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to moderate response" },
      { status: 400 }
    );
  }
}
