import { prisma } from "../lib/db";

export async function startTimer(activityId: string, durationSeconds: number) {
  return await prisma.$transaction(async (tx) => {
    const activity = await tx.activity.findUnique({
      where: { id: activityId },
    });
    if (!activity) throw new Error("Activity not found");

    const endsAt = new Date(Date.now() + durationSeconds * 1000);
    const remainingMs = durationSeconds * 1000;

    const updated = await tx.activity.update({
      where: { id: activityId },
      data: {
        timerSeconds: durationSeconds,
        timerEndsAt: endsAt,
        timerRemainingMs: remainingMs,
        timerStatus: "RUNNING",
      },
    });

    await tx.event.create({
      data: {
        sessionId: activity.sessionId,
        activityId: activity.id,
        eventType: "TIMER_STARTED",
        metadata: JSON.stringify({
          durationSeconds,
          endsAt: endsAt.toISOString(),
        }),
      },
    });

    return updated;
  });
}

export async function pauseTimer(activityId: string) {
  return await prisma.$transaction(async (tx) => {
    const activity = await tx.activity.findUnique({
      where: { id: activityId },
    });
    if (!activity) throw new Error("Activity not found");

    let remainingMs = activity.timerRemainingMs || 0;
    if (activity.timerEndsAt) {
      remainingMs = Math.max(0, activity.timerEndsAt.getTime() - Date.now());
    }

    const updated = await tx.activity.update({
      where: { id: activityId },
      data: {
        timerEndsAt: null,
        timerRemainingMs: remainingMs,
        timerStatus: "PAUSED",
      },
    });

    await tx.event.create({
      data: {
        sessionId: activity.sessionId,
        activityId: activity.id,
        eventType: "TIMER_PAUSED",
        metadata: JSON.stringify({ remainingMs }),
      },
    });

    return updated;
  });
}

export async function resumeTimer(activityId: string) {
  return await prisma.$transaction(async (tx) => {
    const activity = await tx.activity.findUnique({
      where: { id: activityId },
    });
    if (!activity) throw new Error("Activity not found");

    const remainingMs = activity.timerRemainingMs || (activity.timerSeconds ? activity.timerSeconds * 1000 : 60000);
    const endsAt = new Date(Date.now() + remainingMs);

    const updated = await tx.activity.update({
      where: { id: activityId },
      data: {
        timerEndsAt: endsAt,
        timerStatus: "RUNNING",
      },
    });

    await tx.event.create({
      data: {
        sessionId: activity.sessionId,
        activityId: activity.id,
        eventType: "TIMER_RESUMED",
        metadata: JSON.stringify({
          remainingMs,
          endsAt: endsAt.toISOString(),
        }),
      },
    });

    return updated;
  });
}

export async function extendTimer(activityId: string, extraSeconds: number) {
  return await prisma.$transaction(async (tx) => {
    const activity = await tx.activity.findUnique({
      where: { id: activityId },
    });
    if (!activity) throw new Error("Activity not found");

    const extraMs = extraSeconds * 1000;
    let newEndsAt = activity.timerEndsAt;
    let newRemainingMs = (activity.timerRemainingMs || 0) + extraMs;

    if (activity.timerStatus === "RUNNING") {
      const baseTime = activity.timerEndsAt ? activity.timerEndsAt.getTime() : Date.now();
      newEndsAt = new Date(baseTime + extraMs);
      newRemainingMs = Math.max(0, newEndsAt.getTime() - Date.now());
    }

    const updated = await tx.activity.update({
      where: { id: activityId },
      data: {
        timerEndsAt: newEndsAt,
        timerRemainingMs: newRemainingMs,
        timerSeconds: (activity.timerSeconds || 0) + extraSeconds,
      },
    });

    await tx.event.create({
      data: {
        sessionId: activity.sessionId,
        activityId: activity.id,
        eventType: "TIMER_EXTENDED",
        metadata: JSON.stringify({ extraSeconds, newRemainingMs }),
      },
    });

    return updated;
  });
}

export async function completeTimer(activityId: string) {
  return await prisma.$transaction(async (tx) => {
    const activity = await tx.activity.findUnique({
      where: { id: activityId },
    });
    if (!activity) throw new Error("Activity not found");

    const updated = await tx.activity.update({
      where: { id: activityId },
      data: {
        timerStatus: "STOPPED",
        timerEndsAt: null,
        timerRemainingMs: 0,
        state: "LOCKED", // Auto-lock activity
      },
    });

    await tx.event.create({
      data: {
        sessionId: activity.sessionId,
        activityId: activity.id,
        eventType: "TIMER_COMPLETED",
      },
    });

    return updated;
  });
}
