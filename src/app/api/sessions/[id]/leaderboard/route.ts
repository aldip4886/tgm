import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getLeaderboard } from "@/services/scoring.service";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await prisma.session.findUnique({
      where: { id },
      select: { leaderboardVisibility: true },
    });

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const leaderboard = await getLeaderboard(id);

    return NextResponse.json({
      ...leaderboard,
      visibility: session.leaderboardVisibility,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
