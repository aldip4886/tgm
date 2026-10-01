import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "../src/lib/db";
import { createSession, joinSession } from "../src/services/session.service";
import { createActivity, setActivityState, submitResponse } from "../src/services/activity.service";
import {
  toggleReaction,
  createComment,
  awardPeerPoints,
} from "../src/services/peer-interaction.service";
import {
  getOrCreateWhiteboard,
  submitWhiteboard,
  getWhiteboardById,
} from "../src/services/whiteboard.service";
import { awardPoints } from "../src/services/scoring.service";

describe("Peer Rewards, Notifications, and Work Inspection", () => {
  let session: any;
  let activity: any;
  let participant1: any;
  let participant2: any;
  let participant3: any;

  beforeEach(async () => {
    await prisma.event.deleteMany();
    await prisma.point.deleteMany();
    await prisma.reaction.deleteMany();
    await prisma.comment.deleteMany();
    await prisma.response.deleteMany();
    await prisma.whiteboard.deleteMany();
    await prisma.activity.deleteMany();
    await prisma.sessionParticipant.deleteMany();
    await prisma.session.deleteMany();
    await prisma.user.deleteMany();

    session = await createSession({
      title: "Interactive Game Workshop",
      facilitatorName: "Host Alex",
      facilitatorEmail: "alex@workshop.com",
    });

    const p1 = await joinSession({ code: session.code, displayName: "Alice" });
    const p2 = await joinSession({ code: session.code, displayName: "Bob" });
    const p3 = await joinSession({ code: session.code, displayName: "Charlie" });
    participant1 = p1.participant;
    participant2 = p2.participant;
    participant3 = p3.participant;

    activity = await createActivity(session.id, {
      title: "Brainstorming Round",
      prompt: "Share your best ideas",
      type: "OPEN_QUESTION",
    });
    await setActivityState(activity.id, "ACTIVE");
  });

  it("participants start with 20 peer point budget and can award points with reasoning to peers", async () => {
    const resp1 = await submitResponse(activity.id, participant1.id, {
      content: "Use modular state machines",
    });

    const bob = await prisma.sessionParticipant.findUnique({ where: { id: participant2.id } });
    expect(bob?.peerPointBudget).toBe(20);

    const awardResult = await awardPeerPoints(
      resp1.id,
      participant2.id,
      3,
      "Super clever architectural thinking!"
    );

    expect(awardResult.giverName).toBe("Bob");
    expect(awardResult.recipientId).toBe(participant1.id);
    expect(awardResult.recipientName).toBe("Alice");
    expect(awardResult.remainingBudget).toBe(17);
    expect(awardResult.point.amount).toBe(3);
    expect(awardResult.point.reason).toBe("Super clever architectural thinking!");

    const updatedBob = await prisma.sessionParticipant.findUnique({ where: { id: participant2.id } });
    expect(updatedBob?.peerPointBudget).toBe(17);

    const updatedAlice = await prisma.sessionParticipant.findUnique({ where: { id: participant1.id } });
    expect(updatedAlice?.totalPoints).toBe(3);
  });

  it("prevents self-awarding peer points and blocks exceeding peer budget", async () => {
    const resp1 = await submitResponse(activity.id, participant1.id, {
      content: "Self response",
    });

    await expect(
      awardPeerPoints(resp1.id, participant1.id, 5, "I am great")
    ).rejects.toThrow("Cannot award peer points to your own response");

    await expect(
      awardPeerPoints(resp1.id, participant2.id, 25, "Too many points")
    ).rejects.toThrow("Insufficient peer point budget");
  });

  it("whiteboard submission bridges to Response record and can be inspected by peers", async () => {
    const wbActivity = await createActivity(session.id, {
      title: "Team System Diagram",
      prompt: "Draw architecture diagram",
      type: "WHITEBOARD_INDIVIDUAL",
    });
    await setActivityState(wbActivity.id, "ACTIVE");

    const wb = await getOrCreateWhiteboard({
      activityId: wbActivity.id,
      participantId: participant1.id,
      actorId: participant1.id,
    });

    await expect(
      getWhiteboardById(wb.id, participant2.id)
    ).rejects.toThrow("Cannot view another participant's individual whiteboard");

    const scene = JSON.stringify([{ type: "rectangle", x: 10, y: 10, width: 200, height: 100 }]);
    await submitWhiteboard(wb.id, participant1.id, scene);

    const peerInspection = await getWhiteboardById(wb.id, participant2.id);
    expect(peerInspection).not.toBeNull();
    expect(peerInspection?.isSubmitted).toBe(true);

    const responses = await prisma.response.findMany({
      where: { activityId: wbActivity.id, color: "WHITEBOARD" },
    });
    expect(responses.length).toBe(1);
    expect(responses[0].participantId).toBe(participant1.id);

    const parsedContent = JSON.parse(responses[0].content);
    expect(parsedContent.type).toBe("WHITEBOARD");
    expect(parsedContent.whiteboardId).toBe(wb.id);

    const likeRes = await toggleReaction(responses[0].id, participant2.id, "LIKE");
    expect(likeRes.reacted).toBe(true);
    expect(likeRes.count).toBe(1);

    const commentRes = await createComment(
      responses[0].id,
      participant3.id,
      "Clean diagram layout!"
    );
    expect(commentRes.content).toBe("Clean diagram layout!");
    expect(commentRes.participant.displayName).toBe("Charlie");
    expect(commentRes.response.participantId).toBe(participant1.id);

    const pointsRes = await awardPeerPoints(
      responses[0].id,
      participant3.id,
      5,
      "Best diagram of the round"
    );
    expect(pointsRes.giverName).toBe("Charlie");
    expect(pointsRes.recipientId).toBe(participant1.id);
    expect(pointsRes.remainingBudget).toBe(15);
  });

  it("facilitator can award points with category and reasoning", async () => {
    const pt = await awardPoints({
      sessionId: session.id,
      participantId: participant1.id,
      amount: 15,
      category: "FACILITATOR",
      reason: "Outstanding contribution during live discussion",
    });

    expect(pt.amount).toBe(15);
    expect(pt.category).toBe("FACILITATOR");
    expect(pt.reason).toBe("Outstanding contribution during live discussion");

    const updated = await prisma.sessionParticipant.findUnique({ where: { id: participant1.id } });
    expect(updated?.totalPoints).toBe(15);
  });
});
