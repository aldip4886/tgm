import { NextRequest, NextResponse } from "next/server";
import { bulkUploadUsers } from "@/services/user.service";
import { verifyUserToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    let actorRole: string | undefined;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      try {
        const payload = await verifyUserToken(authHeader.substring(7));
        actorRole = payload.role;
      } catch {}
    }

    const contentType = req.headers.get("content-type") || "";
    let csvData = "";

    if (contentType.includes("application/json")) {
      const body = await req.json();
      csvData = body.csv || "";
    } else {
      csvData = await req.text();
    }

    if (!csvData.trim()) {
      return NextResponse.json({ error: "No CSV content provided" }, { status: 400 });
    }

    const result = await bulkUploadUsers(csvData, actorRole);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
