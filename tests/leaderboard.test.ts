import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "../src/lib/db";
import { createSession, joinSession } from "../src/services/session.service";
import { autoSplitParticipants } from "../src/services/team.service";
import {
  awardPoints,
  getLeaderboard,
  setLeaderboardVisibility,
} from "../src/services/scoring.service";

describe("Ticket 08: Multi-Category Scoring Engine & Live Leaderboards", () => {
  let session: any;
  let p1: any, p2: any, p3: any;
  let teams: any[];

  beforeEach(async () => {
    await prisma.event.deleteMany();
    await prisma.point.deleteMany();
    await prisma.whiteboard.deleteMany();
    await prisma.response.deleteMany();
    await prisma.sessionParticipant.deleteMany();
    await prisma.team.deleteMany();
    await prisma.activity.deleteMany();
    await prisma.session.deleteMany();
    await prisma.user.deleteMany();

    session = await createSession({
      title: "Scoring & Championship Session",
      facilitatorName: "Score Master Ron",
      facilitatorEmail: "ron@score.org",
    });

    const [j1, j2, j3] = await Promise.all([
      joinSession({ code: session.code, displayName: "Participant Alpha" }),
      joinSession({ code: session.code, displayName: "Participant Beta" }),
      joinSession({ code: session.code, displayName: "Participant Gamma" }),
    ]);

    p1 = j1.participant;
    p2 = j2.participant;
    p3 = j3.participant;

    teams = await autoSplitParticipants(session.id, 2);
  });

  it("awards points across multi-categories with append-only ledger and transactional score materialization", async () => {
    // 1. Award PARTICIPATION points
    await awardPoints({
      sessionId: session.id,
      participantId: p1.id,
      category: "PARTICIPATION",
      amount: 10,
      reason: "Early joiner bonus",
    });

    // 2. Award CHALLENGE points
    await awardPoints({
      sessionId: session.id,
      participantId: p1.id,
      category: "CHALLENGE",
      amount: 25,
      reason: "Accurate open question answer",
    });

    // 3. Award FACILITATOR discretionary points
    await awardPoints({
      sessionId: session.id,
      participantId: p1.id,
      category: "FACILITATOR",
      amount: 15,
      reason: "Outstanding insight",
    });

    // Verify participant score materialization
    const participantCheck = await prisma.sessionParticipant.findUnique({
      where: { id: p1.id },
    });
    expect(participantCheck?.totalPoints).toBe(50);

    // Verify ledger records
    const pointsLedger = await prisma.point.findMany({
      where: { sessionId: session.id, participantId: p1.id },
    });
    expect(pointsLedger).toHaveLength(3);
  });

  it("computes live leaderboard with rankings and category breakdown", async () => {
    // Award varied points to participants
    await awardPoints({
      sessionId: session.id,
      participantId: p1.id,
      category: "CHALLENGE",
      amount: 40,
    });
    await awardPoints({
      sessionId: session.id,
      participantId: p2.id,
      category: "PARTICIPATION",
      amount: 20,
    });
    await awardPoints({
      sessionId: session.id,
      participantId: p3.id,
      category: "BONUS",
      amount: 60,
    });

    const leaderboard = await getLeaderboard(session.id);

    expect(leaderboard.participants).toHaveLength(3);
    // Rank 1: p3 (60 pts)
    expect(leaderboard.participants[0].id).toBe(p3.id);
    expect(leaderboard.participants[0].rank).toBe(1);
    expect(leaderboard.participants[0].totalPoints).toBe(60);
    expect(leaderboard.participants[0].categories.BONUS).toBe(60);

    // Rank 2: p1 (40 pts)
    expect(leaderboard.participants[1].id).toBe(p1.id);
    expect(leaderboard.participants[1].rank).toBe(2);

    // Rank 3: p2 (20 pts)
    expect(leaderboard.participants[2].id).toBe(p2.id);
    expect(leaderboard.participants[2].rank).toBe(3);

    // Teams leaderboard
    expect(leaderboard.teams).toHaveLength(2);
    expect(leaderboard.teams[0].rank).toBe(1);
  });

  it("updates leaderboard visibility and logs event", async () => {
    const updated = await setLeaderboardVisibility(session.id, "LIVE");
    expect(updated.leaderboardVisibility).toBe("LIVE");

    const recheck = await prisma.session.findUnique({ where: { id: session.id } });
    expect(recheck?.leaderboardVisibility).toBe("LIVE");

    const events = await prisma.event.findMany({
      where: { sessionId: session.id, eventType: "LEADERBOARD_VISIBILITY_UPDATED" },
    });
    expect(events).toHaveLength(1);
  });
});
