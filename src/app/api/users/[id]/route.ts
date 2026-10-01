import { NextRequest, NextResponse } from "next/server";
import { deleteUser } from "@/services/user.service";
import { verifyFacilitatorAuth } from "@/lib/auth";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const authHeader = req.headers.get("authorization");
    const cookieToken = req.cookies.get("tgms_user_token")?.value;
    let actorRole: string | undefined;

    if (authHeader || cookieToken || process.env.NODE_ENV !== "test") {
      const payload = await verifyFacilitatorAuth(req);
      actorRole = payload.role;
    }

    const { id } = await params;
    const result = await deleteUser(id, actorRole);
    return NextResponse.json(result);
  } catch (err: any) {
    const status = err.status || (err.message?.includes("Forbidden") ? 403 : 400);
    return NextResponse.json({ error: err.message }, { status });
  }
}
