import { NextRequest, NextResponse } from "next/server";
import { deleteUser } from "@/services/user.service";
import { verifyUserToken } from "@/lib/auth";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = req.headers.get("authorization");
    let actorRole: string | undefined;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      try {
        const payload = await verifyUserToken(authHeader.substring(7));
        actorRole = payload.role;
      } catch {}
    }

    const { id } = await params;
    const result = await deleteUser(id, actorRole);
    return NextResponse.json(result);
  } catch (err: any) {
    const status = err.message?.includes("Forbidden") ? 403 : 400;
    return NextResponse.json({ error: err.message }, { status });
  }
}
