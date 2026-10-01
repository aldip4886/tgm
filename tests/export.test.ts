import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "../src/lib/db";
import { createSession, joinSession } from "../src/services/session.service";
import { createActivity, setActivityState, submitResponse } from "../src/services/activity.service";
import { linkPresentation, createPresentationMapping } from "../src/services/presentation.service";
import { awardPoints } from "../src/services/scoring.service";
import { autoSplitParticipants } from "../src/services/team.service";
import { getOrCreateWhiteboard, submitWhiteboard } from "../src/services/whiteboard.service";
import { seedDefaultBadges, awardManualBadge } from "../src/services/badge.service";
import { toggleReaction, createComment } from "../src/services/peer-interaction.service";
import { exportSessionData, concludeSession } from "../src/services/export.service";

describe("Ticket 10: Synchronous Session JSON Dataset Export Engine", () => {
  let session: any;
  let participant: any;
  let activity: any;

  beforeEach(async () => {
    await prisma.event.deleteMany();
    await prisma.participantBadge.deleteMany();
    await prisma.badge.deleteMany();
    await prisma.comment.deleteMany();
    await prisma.reaction.deleteMany();
    await prisma.whiteboard.deleteMany();
    await prisma.point.deleteMany();
    await prisma.response.deleteMany();
    await prisma.activity.deleteMany();
    await prisma.presentationMapping.deleteMany();
    await prisma.sessionParticipant.deleteMany();
    await prisma.team.deleteMany();
    await prisma.session.deleteMany();
    await prisma.user.deleteMany();

    await seedDefaultBadges();

    // Create session
    session = await createSession({
      title: "Master Enterprise Strategy Workshop",
      facilitatorName: "Prof. Charles Xavier",
      facilitatorEmail: "charles@xmen.edu",
    });

    // Link presentation
    await linkPresentation(session.id, {
      canvaPresentationUrl: "https://www.canva.com/design/DAGtest123",
      canvaSlideCount: 20,
    });

    // Create activity
    activity = await createActivity(session.id, {
      title: "Case Study 1: Cloud Migration",
      prompt: "Identify the top 3 architectural bottlenecks in legacy monolithic systems.",
      type: "OPEN_QUESTION",
      revealMode: "IMMEDIATE",
    });
    await setActivityState(activity.id, "ACTIVE");

    // Create mapping
    await createPresentationMapping(session.id, {
      slideNumber: 5,
      title: "Cloud Migration Architecture",
      checkpoint: "Architecture Review",
    });

    // Join participant
    const joinRes = await joinSession({
      code: session.code,
      displayName: "Wolverine",
    });
    participant = joinRes.participant;

    // Team auto split
    await autoSplitParticipants(session.id, 2);

    // Participant submits response
    const resp = await submitResponse(activity.id, participant.id, {
      content: "Database coupling and synchronous distributed transactions.",
    });

    // Add reaction and comment
    await toggleReaction(resp.id, participant.id, "LIKE");
    await createComment(resp.id, participant.id, "Completely agree with the DB bottleneck.");

    // Award point
    await awardPoints({
      sessionId: session.id,
      participantId: participant.id,
      category: "CHALLENGE",
      amount: 50,
      reason: "Excellent root-cause breakdown",
    });

    // Whiteboard
    const wb = await getOrCreateWhiteboard({
      activityId: activity.id,
      participantId: participant.id,
      actorId: participant.id,
    });
    await submitWhiteboard(wb.id, participant.id, JSON.stringify([{ type: "rectangle", x: 10, y: 10, width: 100, height: 50 }]));

    // Award badge
    const badges = await prisma.badge.findMany();
    if (badges.length > 0) {
      await awardManualBadge({
        sessionId: session.id,
        participantId: participant.id,
        badgeId: badges[0].id,
        facilitatorId: session.facilitatorId,
        reason: "Fastest breakthrough",
      });
    }
  });

  it("exports complete session dataset conforming strictly to schema_version 1.0", async () => {
    const exportData = await exportSessionData(session.id);

    // Schema version
    expect(exportData.schema_version).toBe("1.0");

    // Session metadata
    expect(exportData.session.id).toBe(session.id);
    expect(exportData.session.title).toBe("Master Enterprise Strategy Workshop");
    expect(exportData.session.code).toBe(session.code);

    // Facilitator metadata
    expect(exportData.facilitator?.name).toBe("Prof. Charles Xavier");
    expect(exportData.facilitator?.email).toBe("charles@xmen.edu");

    // Participants & Teams
    expect(exportData.participants.length).toBeGreaterThanOrEqual(1);
    expect(exportData.participants[0].displayName).toBe("Wolverine");
    expect(exportData.teams.length).toBe(2);

    // Presentations & Mappings
    expect(exportData.presentations.length).toBe(1);
    expect(exportData.presentations[0].canvaUrl).toContain("canva.com");
    expect(exportData.presentation_activity_mappings.length).toBe(1);
    expect(exportData.presentation_activity_mappings[0].slideNumber).toBe(5);

    // Activities & Questions
    expect(exportData.activities.length).toBe(1);
    expect(exportData.activities[0].title).toBe("Case Study 1: Cloud Migration");
    expect(exportData.questions.length).toBe(1);
    expect(exportData.questions[0].prompt).toBe(activity.prompt);

    // Responses, Comments, Likes
    expect(exportData.responses.length).toBe(1);
    expect(exportData.responses[0].content).toContain("Database coupling");
    expect(exportData.comments.length).toBe(1);
    expect(exportData.likes.length).toBe(1);

    // Points, Scores, Leaderboard
    expect(exportData.points.length).toBeGreaterThanOrEqual(1);
    expect(exportData.scores.length).toBeGreaterThanOrEqual(1);
    expect(exportData.leaderboard.participants.length).toBeGreaterThanOrEqual(1);

    // Badges
    expect(exportData.badges.length).toBeGreaterThanOrEqual(1);

    // Whiteboards
    expect(exportData.whiteboards.length).toBe(1);
    expect(exportData.whiteboards[0].isSubmitted).toBe(true);

    // Event audit trail
    expect(exportData.events.length).toBeGreaterThanOrEqual(5);
    expect(exportData.events.some((e: any) => e.eventType === "RESPONSE_SUBMITTED")).toBe(true);
    expect(exportData.events.some((e: any) => e.eventType === "POINT_AWARDED")).toBe(true);
  });

  it("concludes session and locks all open activities", async () => {
    const concluded = await concludeSession(session.id);

    expect(concluded.status).toBe("COMPLETED");

    // Verify all activities are locked or completed
    const acts = await prisma.activity.findMany({ where: { sessionId: session.id } });
    for (const act of acts) {
      expect(["LOCKED", "COMPLETED"]).toContain(act.state);
    }

    // Verify SESSION_ENDED event logged
    const event = await prisma.event.findFirst({
      where: { sessionId: session.id, eventType: "SESSION_ENDED" },
    });
    expect(event).not.toBeNull();
  });

  it("GET /api/sessions/[id]/export/json streams download with attachment headers", async () => {
    const { GET: exportRoute } = await import("../src/app/api/sessions/[id]/export/json/route");
    const { NextRequest } = await import("next/server");

    const req = new NextRequest(`http://localhost:3000/api/sessions/${session.id}/export/json`);
    const res = await exportRoute(req, { params: Promise.resolve({ id: session.id }) });

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("application/json");
    expect(res.headers.get("Content-Disposition")).toContain("attachment; filename=");
    expect(res.headers.get("Content-Disposition")).toContain(".json");

    const data = await res.json();
    expect(data.schema_version).toBe("1.0");
    expect(data.session.id).toBe(session.id);
  });

  it("POST /api/sessions/[id]/conclude successfully marks session completed", async () => {
    const { POST: concludeRoute } = await import("../src/app/api/sessions/[id]/conclude/route");
    const { NextRequest } = await import("next/server");

    const req = new NextRequest(`http://localhost:3000/api/sessions/${session.id}/conclude`, {
      method: "POST",
    });
    const res = await concludeRoute(req, { params: Promise.resolve({ id: session.id }) });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.session.status).toBe("COMPLETED");
  });
});
