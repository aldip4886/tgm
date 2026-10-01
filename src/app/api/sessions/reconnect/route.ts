import { NextRequest, NextResponse } from "next/server";
import { reconnectParticipant } from "@/services/session.service";
import { z } from "zod";

const reconnectSchema = z.object({
  token: z.string().min(10, "Recovery token is required"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = reconnectSchema.parse(body);
    const participant = await reconnectParticipant(validated);
    return NextResponse.json(participant);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to reconnect participant" },
      { status: 401 }
    );
  }
}
