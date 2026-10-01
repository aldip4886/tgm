import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  getPollResults,
  getWordCloudResults,
  getQAResults,
  getRankingResults,
} from "@/services/activity.service";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const { id: activityId } = await params;
    const { searchParams } = new URL(req.url);
    const participantId = searchParams.get("participantId") || undefined;

    const activity = await prisma.activity.findUnique({
      where: { id: activityId },
    });
    if (!activity) {
      return NextResponse.json({ error: "Activity not found" }, { status: 404 });
    }

    let results: any = { type: activity.type };

    if (activity.type === "POLL" || activity.type === "QUIZ") {
      results.poll = await getPollResults(activityId);
    } else if (activity.type === "WORD_CLOUD") {
      results.wordCloud = await getWordCloudResults(activityId);
    } else if (activity.type === "QA") {
      results.qa = await getQAResults(activityId, participantId);
    } else if (activity.type === "RANKING") {
      results.ranking = await getRankingResults(activityId);
    }

    return NextResponse.json(results);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
