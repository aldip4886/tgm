import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "../src/lib/db";
import { createSession, joinSession } from "../src/services/session.service";
import {
  createActivity,
  setActivityState,
  submitResponse,
  getResponses,
  moderateResponse,
} from "../src/services/activity.service";

describe("Ticket 03: Open Question Activity & Reveal Mode", () => {
  let session: any;
  let participant1: any;
  let participant2: any;

  beforeEach(async () => {
    await prisma.event.deleteMany();
    await prisma.reaction.deleteMany();
    await prisma.comment.deleteMany();
    await prisma.response.deleteMany();
    await prisma.activity.deleteMany();
    await prisma.presentationMapping.deleteMany();
    await prisma.sessionParticipant.deleteMany();
    await prisma.session.deleteMany();
    await prisma.user.deleteMany();

    session = await createSession({
      title: "Problem Solving Lab",
      facilitatorName: "Dr. Watson",
      facilitatorEmail: "watson@lab.org",
    });

    const p1 = await joinSession({ code: session.code, displayName: "Participant One" });
    const p2 = await joinSession({ code: session.code, displayName: "Participant Two" });
    participant1 = p1.participant;
    participant2 = p2.participant;
  });

  it("facilitator can create an activity and activate it, completing any prior active activity", async () => {
    const act1 = await createActivity(session.id, {
      title: "Warm Up Question",
      prompt: "What is your main goal today?",
      revealMode: "UPON_LOCK",
    });
    expect(act1.state).toBe("DRAFT");

    // Activate act1
    const activeAct1 = await setActivityState(act1.id, "ACTIVE");
    expect(activeAct1.state).toBe("ACTIVE");

    // Create and activate act2
    const act2 = await createActivity(session.id, {
      title: "Core Case Challenge",
      prompt: "How would you solve the bottleneck?",
      revealMode: "UPON_LOCK",
    });
    const activeAct2 = await setActivityState(act2.id, "ACTIVE");
    expect(activeAct2.state).toBe("ACTIVE");

    // act1 should now be COMPLETED (ADR-0005: Strict Single-Active Lifecycle)
    const refreshedAct1 = await prisma.activity.findUnique({ where: { id: act1.id } });
    expect(refreshedAct1?.state).toBe("COMPLETED");

    // Check event log
    const events = await prisma.event.findMany({
      where: { sessionId: session.id, eventType: "ACTIVITY_ACTIVATED" },
    });
    expect(events.length).toBeGreaterThanOrEqual(2);
  });

  it("participants can submit responses only while activity is ACTIVE", async () => {
    const act = await createActivity(session.id, {
      title: "Prompt",
      prompt: "Your thoughts?",
    });

    // Submitting in DRAFT should throw
    await expect(
      submitResponse(act.id, participant1.id, { content: "Too early" })
    ).rejects.toThrow("Activity is not active for submissions");

    // Activate
    await setActivityState(act.id, "ACTIVE");

    // Submitting in ACTIVE should succeed
    const response = await submitResponse(act.id, participant1.id, {
      content: "Prioritize user research",
    });
    expect(response.id).toBeDefined();
    expect(response.content).toBe("Prioritize user research");

    // Event log
    const events = await prisma.event.findMany({
      where: { activityId: act.id, eventType: "RESPONSE_SUBMITTED" },
    });
    expect(events).toHaveLength(1);

    // Submitting after LOCKED should throw
    await setActivityState(act.id, "LOCKED");
    await expect(
      submitResponse(act.id, participant2.id, { content: "Too late" })
    ).rejects.toThrow("Activity is not active for submissions");
  });

  it("enforces UPON_LOCK revealMode: participants only see own response until locked", async () => {
    const act = await createActivity(session.id, {
      title: "Blind Poll / Case",
      prompt: "What is your diagnosis?",
      revealMode: "UPON_LOCK",
    });
    await setActivityState(act.id, "ACTIVE");

    await submitResponse(act.id, participant1.id, { content: "Diagnosis A" });
    await submitResponse(act.id, participant2.id, { content: "Diagnosis B" });

    // Participant 1 views responses while ACTIVE: sees only their own response
    const p1ViewsActive = await getResponses(act.id, participant1.id, false);
    expect(p1ViewsActive).toHaveLength(1);
    expect(p1ViewsActive[0].content).toBe("Diagnosis A");

    // Facilitator views responses while ACTIVE: sees all responses
    const facilitatorViewsActive = await getResponses(act.id, undefined, true);
    expect(facilitatorViewsActive).toHaveLength(2);

    // Lock activity
    await setActivityState(act.id, "LOCKED");

    // Now Participant 1 views responses while LOCKED: sees all responses
    const p1ViewsLocked = await getResponses(act.id, participant1.id, false);
    expect(p1ViewsLocked).toHaveLength(2);
  });

  it("facilitator can hide a response for moderation", async () => {
    const act = await createActivity(session.id, {
      title: "Feedback",
      prompt: "Open thoughts",
      revealMode: "IMMEDIATE",
    });
    await setActivityState(act.id, "ACTIVE");

    const resp = await submitResponse(act.id, participant1.id, {
      content: "Inappropriate spam",
    });

    await moderateResponse(resp.id, true);

    // Participant view hides it
    const participantView = await getResponses(act.id, participant2.id, false);
    expect(participantView).toHaveLength(0);

    // Facilitator still sees it flagged as hidden
    const facilitatorView = await getResponses(act.id, undefined, true);
    expect(facilitatorView).toHaveLength(1);
    expect(facilitatorView[0].isHidden).toBe(true);
  });
});
