import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "../src/lib/db";
import { createSession, joinSession } from "../src/services/session.service";
import { createActivity } from "../src/services/activity.service";
import { autoSplitParticipants } from "../src/services/team.service";
import {
  getOrCreateWhiteboard,
  saveWhiteboardScene,
  submitWhiteboard,
  getWhiteboardsForActivity,
  getWhiteboardById,
} from "../src/services/whiteboard.service";

describe("Ticket 07: Real-Time Excalidraw Collaborative Whiteboard", () => {
  let session: any;
  let activity: any;
  let p1: any, p2: any;
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
      title: "Design Sprint Whiteboard Session",
      facilitatorName: "Lead Designer Maya",
      facilitatorEmail: "maya@design.org",
    });

    const [j1, j2] = await Promise.all([
      joinSession({ code: session.code, displayName: "Designer Alice" }),
      joinSession({ code: session.code, displayName: "Designer Bob" }),
    ]);
    p1 = j1.participant;
    p2 = j2.participant;

    teams = await autoSplitParticipants(session.id, 2);

    activity = await createActivity(session.id, {
      title: "Brainstorm Architecture Diagram",
      prompt: "Sketch the microservices architecture for the project",
      type: "WHITEBOARD",
    });
  });

  it("creates and retrieves a team whiteboard collaboratively", async () => {
    const team = teams[0];

    const wb = await getOrCreateWhiteboard({
      activityId: activity.id,
      teamId: team.id,
      actorId: p1.id,
    });

    expect(wb).toBeDefined();
    expect(wb.activityId).toBe(activity.id);
    expect(wb.teamId).toBe(team.id);
    expect(wb.isSubmitted).toBe(false);

    // Another teammate accessing the same board gets the exact same whiteboard
    const sameWb = await getOrCreateWhiteboard({
      activityId: activity.id,
      teamId: team.id,
      actorId: p2.id,
    });

    expect(sameWb.id).toBe(wb.id);

    // Verify event logged
    const events = await prisma.event.findMany({
      where: { sessionId: session.id, eventType: "WHITEBOARD_OPENED" },
    });
    expect(events.length).toBeGreaterThanOrEqual(1);
  });

  it("persists debounced scene state to PostgreSQL", async () => {
    const team = teams[0];
    const wb = await getOrCreateWhiteboard({
      activityId: activity.id,
      teamId: team.id,
      actorId: p1.id,
    });

    const mockSceneData = JSON.stringify({
      elements: [{ id: "elem-1", type: "rectangle", x: 100, y: 150 }],
      appState: { zoom: 1 },
    });

    const updated = await saveWhiteboardScene(wb.id, mockSceneData, p1.id);
    expect(updated.sceneData).toBe(mockSceneData);

    const recheck = await getWhiteboardById(wb.id);
    expect(recheck?.sceneData).toBe(mockSceneData);

    const events = await prisma.event.findMany({
      where: { sessionId: session.id, eventType: "WHITEBOARD_SAVED" },
    });
    expect(events).toHaveLength(1);
  });

  it("allows participants to submit whiteboard to facilitator and records milestone", async () => {
    const team = teams[0];
    const wb = await getOrCreateWhiteboard({
      activityId: activity.id,
      teamId: team.id,
      actorId: p1.id,
    });

    const finalSceneData = JSON.stringify({
      elements: [
        { id: "elem-1", type: "rectangle", x: 100, y: 150 },
        { id: "elem-2", type: "arrow", x: 200, y: 250 },
      ],
      appState: { zoom: 1.2 },
    });

    const submitted = await submitWhiteboard(wb.id, p1.id, finalSceneData);
    expect(submitted.isSubmitted).toBe(true);
    expect(submitted.submittedAt).toBeDefined();
    expect(submitted.sceneData).toBe(finalSceneData);

    const facilitatorView = await getWhiteboardsForActivity(activity.id);
    expect(facilitatorView).toHaveLength(1);
    expect(facilitatorView[0].id).toBe(wb.id);
    expect(facilitatorView[0].isSubmitted).toBe(true);

    const events = await prisma.event.findMany({
      where: { sessionId: session.id, eventType: "WHITEBOARD_SUBMITTED" },
    });
    expect(events).toHaveLength(1);
  });
});
