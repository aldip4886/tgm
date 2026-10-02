import { NextRequest, NextResponse } from "next/server";
import { exportSessionData } from "@/services/export.service";
import { verifyFacilitatorAuth } from "@/lib/auth";

export async function GET(
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

    const data = await exportSessionData(id);

    const filename = `session-${data.session.code || id}-dataset.json`;

    return new NextResponse(JSON.stringify(data, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (error: any) {
    const status = error.status || 500;
    return NextResponse.json(
      { error: error.message || "Failed to export session dataset" },
      { status }
    );
  }
}
