import { NextRequest, NextResponse } from "next/server";
import { getAllBadges, seedDefaultBadges } from "@/services/badge.service";

export async function GET() {
  try {
    await seedDefaultBadges();
    const badges = await getAllBadges();
    return NextResponse.json(badges);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
