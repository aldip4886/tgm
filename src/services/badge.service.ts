import { prisma } from "../lib/db";
import { Prisma } from "@prisma/client";

const DEFAULT_BADGES = [
  {
    name: "Centurion",
    description: "Earned 100 or more total points across session activities",
    icon: "Crown",
    ruleType: "AUTOMATIC_POINTS",
    ruleValue: 100,
  },
  {
    name: "Point Pioneer",
    description: "Earned 50 or more total points",
    icon: "Star",
    ruleType: "AUTOMATIC_POINTS",
    ruleValue: 50,
  },
  {
    name: "Active Thinker",
    description: "Submitted 3 or more active challenge responses",
    icon: "Zap",
    ruleType: "AUTOMATIC_RESPONSES",
    ruleValue: 3,
  },
  {
    name: "Spotlight Leader",
    description: "Awarded by facilitator for exemplary collaboration or leadership",
    icon: "Award",
    ruleType: "MANUAL",
    ruleValue: null,
  },
  {
    name: "Innovation Master",
    description: "Awarded by facilitator for breakthrough creative ideas",
    icon: "Sparkles",
    ruleType: "MANUAL",
    ruleValue: null,
  },
];

export async function seedDefaultBadges() {
  for (const b of DEFAULT_BADGES) {
    await prisma.badge.upsert({
      where: { name: b.name },
      update: {
        description: b.description,
        icon: b.icon,
        ruleType: b.ruleType,
        ruleValue: b.ruleValue,
      },
      create: {
        name: b.name,
        description: b.description,
        icon: b.icon,
        ruleType: b.ruleType,
        ruleValue: b.ruleValue,
      },
    });
  }
}

export async function evaluateAutomaticBadges(
  tx: Prisma.TransactionClient,
  sessionId: string,
  participantId: string
) {
  const participant = await tx.sessionParticipant.findUnique({
    where: { id: participantId },
    include: {
      responses: true,
      badges: {
        where: { sessionId },
      },
    },
  });
  if (!participant) return [];

  const existingBadgeIds = new Set(participant.badges.map((b) => b.badgeId));
  const automaticBadges = await tx.badge.findMany({
    where: {
      ruleType: { in: ["AUTOMATIC_POINTS", "AUTOMATIC_RESPONSES"] },
    },
  });

  const newlyAwarded = [];

  for (const badge of automaticBadges) {
    if (existingBadgeIds.has(badge.id)) continue;

    let qualifies = false;

    if (badge.ruleType === "AUTOMATIC_POINTS" && badge.ruleValue !== null) {
      if (participant.totalPoints >= badge.ruleValue) {
        qualifies = true;
      }
    } else if (badge.ruleType === "AUTOMATIC_RESPONSES" && badge.ruleValue !== null) {
      if (participant.responses.length >= badge.ruleValue) {
        qualifies = true;
      }
    }

    if (qualifies) {
      const awarded = await tx.participantBadge.create({
        data: {
          sessionId,
          participantId,
          badgeId: badge.id,
          awardedBy: "SYSTEM",
          reason: badge.description,
        },
        include: { badge: true },
      });

      await tx.event.create({
        data: {
          sessionId,
          actorId: participantId,
          targetId: awarded.id,
          eventType: "BADGE_AWARDED",
          metadata: JSON.stringify({
            badgeId: badge.id,
            badgeName: badge.name,
            ruleType: badge.ruleType,
          }),
        },
      });

      newlyAwarded.push(awarded);
    }
  }

  return newlyAwarded;
}

export interface AwardManualBadgeInput {
  sessionId: string;
  participantId: string;
  badgeId: string;
  facilitatorId: string;
  reason?: string;
}

export async function awardManualBadge(input: AwardManualBadgeInput) {
  const { sessionId, participantId, badgeId, facilitatorId, reason } = input;

  return await prisma.$transaction(async (tx) => {
    const badge = await tx.badge.findUnique({ where: { id: badgeId } });
    if (!badge) throw new Error("Badge not found");

    const awarded = await tx.participantBadge.create({
      data: {
        sessionId,
        participantId,
        badgeId,
        awardedBy: facilitatorId,
        reason: reason?.trim() || null,
      },
      include: { badge: true },
    });

    await tx.event.create({
      data: {
        sessionId,
        actorId: facilitatorId,
        targetId: awarded.id,
        eventType: "BADGE_AWARDED",
        metadata: JSON.stringify({
          badgeId,
          badgeName: badge.name,
          participantId,
          reason,
        }),
      },
    });

    return awarded;
  });
}

export async function getBadgesForParticipant(
  sessionId: string,
  participantId: string
) {
  return await prisma.participantBadge.findMany({
    where: { sessionId, participantId },
    include: { badge: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function getAllBadges() {
  return await prisma.badge.findMany({
    orderBy: { createdAt: "asc" },
  });
}
