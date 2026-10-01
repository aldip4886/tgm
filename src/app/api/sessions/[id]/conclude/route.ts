import { NextRequest, NextResponse } from "next/server";
import { concludeSession } from "@/services/export.service";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await concludeSession(id);
    return NextResponse.json({ success: true, session });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to conclude session" },
      { status: 500 }
    );
  }
}
