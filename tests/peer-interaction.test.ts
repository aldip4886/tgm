import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "../src/lib/db";
import { createSession, joinSession } from "../src/services/session.service";
import { createActivity, setActivityState, submitResponse } from "../src/services/activity.service";
import {
  toggleReaction,
  createComment,
  deleteComment,
  awardPeerPoints,
  revokePoint,
} from "../src/services/peer-interaction.service";

describe("Ticket 05: Peer Interaction & Dedicated Peer Point Budget", () => {
  let session: any;
  let activity: any;
  let participant1: any;
  let participant2: any;
  let response1: any;

  beforeEach(async () => {
    await prisma.event.deleteMany();
    await prisma.point.deleteMany();
    await prisma.reaction.deleteMany();
    await prisma.comment.deleteMany();
    await prisma.response.deleteMany();
    await prisma.activity.deleteMany();
    await prisma.sessionParticipant.deleteMany();
    await prisma.session.deleteMany();
    await prisma.user.deleteMany();

    session = await createSession({
      title: "Collaborative Workshop",
      facilitatorName: "Instructor Sam",
      facilitatorEmail: "sam@collab.org",
    });

    const p1 = await joinSession({ code: session.code, displayName: "Participant One" });
    const p2 = await joinSession({ code: session.code, displayName: "Participant Two" });
    participant1 = p1.participant;
    participant2 = p2.participant;

    activity = await createActivity(session.id, {
      title: "Ideation Challenge",
      prompt: "Propose an idea",
    });
    await setActivityState(activity.id, "ACTIVE");

    response1 = await submitResponse(activity.id, participant1.id, {
      content: "Use decentralized event architecture",
    });
  });

  it("participant can toggle likes on responses with deduplication", async () => {
    // Add like
    const res1 = await toggleReaction(response1.id, participant2.id, "LIKE");
    expect(res1.reacted).toBe(true);
    expect(res1.count).toBe(1);

    const event1 = await prisma.event.findMany({
      where: { eventType: "LIKE_ADDED" },
    });
    expect(event1).toHaveLength(1);

    // Toggle off (remove like)
    const res2 = await toggleReaction(response1.id, participant2.id, "LIKE");
    expect(res2.reacted).toBe(false);
    expect(res2.count).toBe(0);

    const event2 = await prisma.event.findMany({
      where: { eventType: "LIKE_REMOVED" },
    });
    expect(event2).toHaveLength(1);
  });

  it("participants can create threaded comments on responses", async () => {
    const comment = await createComment(
      response1.id,
      participant2.id,
      "Great architecture suggestion!"
    );

    expect(comment.id).toBeDefined();
    expect(comment.content).toBe("Great architecture suggestion!");
    expect(comment.participantId).toBe(participant2.id);

    // Threaded reply
    const reply = await createComment(
      response1.id,
      participant1.id,
      "Thanks! It scales well.",
      comment.id
    );
    expect(reply.parentId).toBe(comment.id);

    const events = await prisma.event.findMany({
      where: { eventType: "COMMENT_CREATED" },
    });
    expect(events).toHaveLength(2);
  });

  it("participants can award peer points deducting from budget without reducing own score", async () => {
    // Initial: participant2 has budget 20, score 0; participant1 has budget 20, score 0
    const awardResult = await awardPeerPoints(
      response1.id,
      participant2.id,
      5,
      "Exceptionally clear idea"
    );

    expect(awardResult.point.amount).toBe(5);
    expect(awardResult.remainingBudget).toBe(15);

    // Verify recipient (participant1) received score
    const recipient = await prisma.sessionParticipant.findUnique({
      where: { id: participant1.id },
    });
    expect(recipient?.totalPoints).toBe(5);

    // Verify giver (participant2) budget deducted, but earned score NOT reduced
    const giver = await prisma.sessionParticipant.findUnique({
      where: { id: participant2.id },
    });
    expect(giver?.peerPointBudget).toBe(15);
    expect(giver?.totalPoints).toBe(0); // Personal score unaffected (ADR-0007)

    // Event log
    const events = await prisma.event.findMany({
      where: { eventType: "POINT_AWARDED" },
    });
    expect(events).toHaveLength(1);
  });

  it("prevents self-awarding peer points and exceeding budget", async () => {
    // Self awarding
    await expect(
      awardPeerPoints(response1.id, participant1.id, 5, "Nice myself")
    ).rejects.toThrow("Cannot award peer points to your own response");

    // Exceeding budget
    await expect(
      awardPeerPoints(response1.id, participant2.id, 50, "Way too much")
    ).rejects.toThrow("Insufficient peer point budget");
  });

  it("facilitator can revoke points and delete comments", async () => {
    const comment = await createComment(response1.id, participant2.id, "Spam comment");
    await deleteComment(comment.id, session.facilitatorId, true);

    const deleted = await prisma.comment.findUnique({ where: { id: comment.id } });
    expect(deleted?.isHidden).toBe(true);

    // Award point then revoke
    const { point } = await awardPeerPoints(response1.id, participant2.id, 5, "Good");
    await revokePoint(point.id, session.facilitatorId);

    const recipient = await prisma.sessionParticipant.findUnique({
      where: { id: participant1.id },
    });
    expect(recipient?.totalPoints).toBe(0);

    const giver = await prisma.sessionParticipant.findUnique({
      where: { id: participant2.id },
    });
    expect(giver?.peerPointBudget).toBe(20); // Refunded
  });
});
