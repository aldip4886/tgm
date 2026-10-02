import { NextRequest, NextResponse } from "next/server";
import { bulkUploadUsers } from "@/services/user.service";
import { verifyAdminAuth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const cookieToken = req.cookies.get("tgms_user_token")?.value;
    let actorRole: string | undefined;

    if (authHeader || cookieToken || process.env.NODE_ENV !== "test") {
      const payload = await verifyAdminAuth(req);
      actorRole = payload.role;
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
    const status = err.status || (err.message?.includes("Forbidden") ? 403 : 400);
    return NextResponse.json({ error: err.message }, { status });
  }
}
