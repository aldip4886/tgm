import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "../src/lib/db";
import { createSession, joinSession } from "../src/services/session.service";
import { createActivity, submitResponse } from "../src/services/activity.service";
import { awardPoints } from "../src/services/scoring.service";
import {
  seedDefaultBadges,
  evaluateAutomaticBadges,
  awardManualBadge,
  getBadgesForParticipant,
  getAllBadges,
} from "../src/services/badge.service";

describe("Ticket 09: Real-Time Badge Trigger Evaluation & Facilitator Awards", () => {
  let session: any;
  let participant: any;

  beforeEach(async () => {
    await prisma.event.deleteMany();
    await prisma.participantBadge.deleteMany();
    await prisma.badge.deleteMany();
    await prisma.point.deleteMany();
    await prisma.response.deleteMany();
    await prisma.sessionParticipant.deleteMany();
    await prisma.activity.deleteMany();
    await prisma.session.deleteMany();
    await prisma.user.deleteMany();

    await seedDefaultBadges();

    session = await createSession({
      title: "Badge Certification Championship",
      facilitatorName: "Judge Judy",
      facilitatorEmail: "judy@badge.org",
    });

    const joinRes = await joinSession({
      code: session.code,
      displayName: "Achievement Seeker",
    });
    participant = joinRes.participant;
  });

  it("seeds default badge taxonomy", async () => {
    const badges = await getAllBadges();
    expect(badges.length).toBeGreaterThanOrEqual(4);
    expect(badges.some((b) => b.name === "Centurion")).toBe(true);
    expect(badges.some((b) => b.name === "Spotlight Leader")).toBe(true);
  });

  it("automatically awards points-based badge upon crossing threshold in transaction", async () => {
    // Award 100 points
    const pointResult = await awardPoints({
      sessionId: session.id,
      participantId: participant.id,
      category: "CHALLENGE",
      amount: 100,
    });

    expect(pointResult.newBadges.length).toBeGreaterThanOrEqual(1);
    expect(pointResult.newBadges.some((b: any) => b.badge.name === "Centurion")).toBe(true);

    const earned = await getBadgesForParticipant(session.id, participant.id);
    expect(earned.some((b) => b.badge.name === "Centurion")).toBe(true);

    // Event log
    const events = await prisma.event.findMany({
      where: { sessionId: session.id, eventType: "BADGE_AWARDED" },
    });
    expect(events.length).toBeGreaterThanOrEqual(1);
  });

  it("facilitator can manually award a badge with citation and reason", async () => {
    const badges = await getAllBadges();
    const manualBadge = badges.find((b) => b.ruleType === "MANUAL");
    expect(manualBadge).toBeDefined();

    const awarded = await awardManualBadge({
      sessionId: session.id,
      participantId: participant.id,
      badgeId: manualBadge!.id,
      facilitatorId: session.facilitatorId,
      reason: "Demonstrated phenomenal creative thinking during the breakout",
    });

    expect(awarded.badgeId).toBe(manualBadge!.id);
    expect(awarded.reason).toContain("Demonstrated phenomenal creative thinking");

    const earned = await getBadgesForParticipant(session.id, participant.id);
    expect(earned).toHaveLength(1);
    expect(earned[0].badge.name).toBe(manualBadge!.name);
  });
});
