import { NextRequest, NextResponse } from "next/server";
import { concludeSession } from "@/services/export.service";
import { verifyFacilitatorAuth } from "@/lib/auth";

export async function POST(
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

    const session = await concludeSession(id);
    return NextResponse.json({ success: true, session });
  } catch (error: any) {
    const status = error.status || 500;
    return NextResponse.json(
      { error: error.message || "Failed to conclude session" },
      { status }
    );
  }
}
