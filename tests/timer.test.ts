import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "../src/lib/db";
import { createSession } from "../src/services/session.service";
import { createActivity, setActivityState } from "../src/services/activity.service";
import {
  startTimer,
  pauseTimer,
  resumeTimer,
  extendTimer,
  completeTimer,
} from "../src/services/timer.service";

describe("Ticket 04: Server-Authoritative Synchronized Digital Timer", () => {
  let session: any;
  let activity: any;

  beforeEach(async () => {
    await prisma.event.deleteMany();
    await prisma.response.deleteMany();
    await prisma.activity.deleteMany();
    await prisma.session.deleteMany();
    await prisma.user.deleteMany();

    session = await createSession({
      title: "Agile Estimation",
      facilitatorName: "Scrum Master",
      facilitatorEmail: "sm@agile.org",
    });

    activity = await createActivity(session.id, {
      title: "Story Point Challenge",
      prompt: "Estimate user story 42",
    });
    await setActivityState(activity.id, "ACTIVE");
  });

  it("starts a timer with UTC endsAt target and logs TIMER_STARTED", async () => {
    const started = await startTimer(activity.id, 300); // 5 minutes

    expect(started.timerStatus).toBe("RUNNING");
    expect(started.timerEndsAt).toBeDefined();
    expect(started.timerRemainingMs).toBe(300000);

    const now = Date.now();
    const endsAtMs = new Date(started.timerEndsAt!).getTime();
    expect(endsAtMs).toBeGreaterThan(now + 295000);
    expect(endsAtMs).toBeLessThanOrEqual(now + 301000);

    // Event log
    const events = await prisma.event.findMany({
      where: { activityId: activity.id, eventType: "TIMER_STARTED" },
    });
    expect(events).toHaveLength(1);
    expect(JSON.parse(events[0].metadata || "{}").durationSeconds).toBe(300);
  });

  it("pauses and resumes a running timer accurately", async () => {
    await startTimer(activity.id, 120);

    const paused = await pauseTimer(activity.id);
    expect(paused.timerStatus).toBe("PAUSED");
    expect(paused.timerEndsAt).toBeNull();
    expect(paused.timerRemainingMs).toBeGreaterThan(0);
    expect(paused.timerRemainingMs).toBeLessThanOrEqual(120000);

    const resumed = await resumeTimer(activity.id);
    expect(resumed.timerStatus).toBe("RUNNING");
    expect(resumed.timerEndsAt).toBeDefined();

    // Verify events
    const pauseEvents = await prisma.event.findMany({
      where: { activityId: activity.id, eventType: "TIMER_PAUSED" },
    });
    expect(pauseEvents).toHaveLength(1);

    const resumeEvents = await prisma.event.findMany({
      where: { activityId: activity.id, eventType: "TIMER_RESUMED" },
    });
    expect(resumeEvents).toHaveLength(1);
  });

  it("extends a timer by additional seconds", async () => {
    await startTimer(activity.id, 60);

    const extended = await extendTimer(activity.id, 60); // add 1 minute
    expect(extended.timerStatus).toBe("RUNNING");
    expect(extended.timerRemainingMs).toBeGreaterThan(115000);

    const events = await prisma.event.findMany({
      where: { activityId: activity.id, eventType: "TIMER_EXTENDED" },
    });
    expect(events).toHaveLength(1);
  });

  it("completing a timer automatically transitions the activity to LOCKED", async () => {
    await startTimer(activity.id, 10);

    const completed = await completeTimer(activity.id);
    expect(completed.timerStatus).toBe("STOPPED");
    expect(completed.state).toBe("LOCKED"); // ADR-0008 & Ticket 04 requirement: auto-locks

    const refreshedAct = await prisma.activity.findUnique({ where: { id: activity.id } });
    expect(refreshedAct?.state).toBe("LOCKED");

    const events = await prisma.event.findMany({
      where: { activityId: activity.id, eventType: "TIMER_COMPLETED" },
    });
    expect(events).toHaveLength(1);
  });
});
