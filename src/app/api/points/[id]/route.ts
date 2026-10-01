import { NextRequest, NextResponse } from "next/server";
import { revokePoint } from "@/services/peer-interaction.service";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const result = await revokePoint(params.id, "FACILITATOR");
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to revoke point" },
      { status: 400 }
    );
  }
}
