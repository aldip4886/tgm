import { NextRequest, NextResponse } from "next/server";
import { submitResponse, getResponses } from "@/services/activity.service";
import { verifyParticipantToken } from "@/lib/auth";
import { z } from "zod";

const submitSchema = z.object({
  content: z.string().min(1, "Response content cannot be empty"),
  color: z.string().optional(),
  teamId: z.string().optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const isFacilitator = req.nextUrl.searchParams.get("isFacilitator") === "true";
    const authHeader = req.headers.get("authorization");
    let participantId: string | undefined;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      try {
        const token = authHeader.substring(7);
        const payload = await verifyParticipantToken(token);
        participantId = payload.participantId;
      } catch {}
    }

    const responses = await getResponses(params.id, participantId, isFacilitator);
    return NextResponse.json(responses);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized: Missing participant token" }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const payload = await verifyParticipantToken(token);

    const body = await req.json();
    const validated = submitSchema.parse(body);

    const response = await submitResponse(params.id, payload.participantId, validated);
    return NextResponse.json(response, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to submit response" },
      { status: 400 }
    );
  }
}
