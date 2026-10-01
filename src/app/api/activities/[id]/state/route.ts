import { NextRequest, NextResponse } from "next/server";
import { setActivityState } from "@/services/activity.service";
import { z } from "zod";

const stateSchema = z.object({
  state: z.enum(["DRAFT", "ACTIVE", "LOCKED", "COMPLETED"]),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const validated = stateSchema.parse(body);
    const updated = await setActivityState(params.id, validated.state);
    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to update activity state" },
      { status: 400 }
    );
  }
}
