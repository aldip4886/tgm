import { NextRequest, NextResponse } from "next/server";
import { setLeaderboardVisibility } from "@/services/scoring.service";
import { verifyFacilitatorAuth } from "@/lib/auth";
import { z } from "zod";

const schema = z.object({
  visibility: z.enum(["HIDDEN", "LIVE", "END_OF_ACTIVITY"]),
  actorId: z.string().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authHeader = req.headers.get("authorization");
    const cookieToken = req.cookies.get("tgms_user_token")?.value;
    if (authHeader || cookieToken || process.env.NODE_ENV !== "test") {
      await verifyFacilitatorAuth(req, id);
    }

    const body = await req.json();
    const data = schema.parse(body);

    const updated = await setLeaderboardVisibility(id, data.visibility, data.actorId);

    return NextResponse.json(updated);
  } catch (err: any) {
    const status = err.status || 400;
    return NextResponse.json({ error: err.message }, { status });
  }
}
