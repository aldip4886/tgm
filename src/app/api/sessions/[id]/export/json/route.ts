import { NextRequest, NextResponse } from "next/server";
import { exportSessionData } from "@/services/export.service";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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
    return NextResponse.json(
      { error: error.message || "Failed to export session dataset" },
      { status: 500 }
    );
  }
}
