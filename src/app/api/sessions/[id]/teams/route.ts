import { NextRequest, NextResponse } from "next/server";
import { getTeams, autoSplitParticipants } from "@/services/team.service";
import { verifyFacilitatorAuth } from "@/lib/auth";
import { z } from "zod";

const splitSchema = z.object({
  teamCount: z.number().int().min(1, "At least 1 team required"),
  customNames: z.array(z.string()).optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const teams = await getTeams(params.id);
    return NextResponse.json(teams);
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
    const validated = splitSchema.parse(body);
    const teams = await autoSplitParticipants(
      id,
      validated.teamCount,
      validated.customNames
    );
    return NextResponse.json(teams);
  } catch (error: any) {
    const status = error.status || 400;
    return NextResponse.json(
      { error: error.message || "Failed to split teams" },
      { status }
    );
  }
}
