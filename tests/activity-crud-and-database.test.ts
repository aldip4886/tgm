import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "../src/lib/db";
import { NextRequest } from "next/server";
import { signUserToken } from "../src/lib/auth";
import { createUser } from "../src/services/user.service";
import { createSession } from "../src/services/session.service";
import {
  createActivity,
  getActivityById,
  getActivitiesWithStats,
  updateActivity,
  deleteActivity,
  submitResponse,
} from "../src/services/activity.service";
import { GET as getSessionsRoute } from "../src/app/api/sessions/route";
import {
  GET as getActivityRoute,
  PATCH as patchActivityRoute,
  DELETE as deleteActivityRoute,
} from "../src/app/api/activities/[id]/route";

describe("Learning Activity Database & CRUD Integration", () => {
  let facA: any;
  let facB: any;
  let admin: any;
  let sessionA: any;
  let sessionB: any;
  let tokenFacA: string;
  let tokenFacB: string;
  let tokenAdmin: string;

  beforeEach(async () => {
    await prisma.event.deleteMany();
    await prisma.point.deleteMany();
    await prisma.presentationMapping.deleteMany();
    await prisma.whiteboard.deleteMany();
    await prisma.comment.deleteMany();
    await prisma.reaction.deleteMany();
    await prisma.response.deleteMany();
    await prisma.sessionParticipant.deleteMany();
    await prisma.team.deleteMany();
    await prisma.activity.deleteMany();
    await prisma.session.deleteMany();
    await prisma.user.deleteMany();

    facA = await createUser(
      {
        username: "fac_alpha",
        password: "Password123",
        name: "Facilitator Alpha",
        email: "alpha@test.com",
        role: "FACILITATOR",
      },
      "SUPER_ADMIN"
    );

    facB = await createUser(
      {
        username: "fac_beta",
        password: "Password123",
        name: "Facilitator Beta",
        email: "beta@test.com",
        role: "FACILITATOR",
      },
      "SUPER_ADMIN"
    );

    admin = await createUser(
      {
        username: "admin_super",
        password: "Password123",
        name: "System Admin",
        email: "admin@test.com",
        role: "ADMIN",
      },
      "SUPER_ADMIN"
    );

    tokenFacA = await signUserToken({
      userId: facA.id,
      username: facA.username,
      role: facA.role,
    });

    tokenFacB = await signUserToken({
      userId: facB.id,
      username: facB.username,
      role: facB.role,
    });

    tokenAdmin = await signUserToken({
      userId: admin.id,
      username: admin.username,
      role: admin.role,
    });

    sessionA = await createSession({
      title: "Session Alpha",
      facilitatorEmail: facA.email,
      facilitatorName: facA.name,
    });

    sessionB = await createSession({
      title: "Session Beta",
      facilitatorEmail: facB.email,
      facilitatorName: facB.name,
    });
  });

  describe("1. GET /api/sessions (Session listing scoped by role)", () => {
    it("returns only owned sessions for a FACILITATOR", async () => {
      const req = new NextRequest("http://localhost:3000/api/sessions", {
        headers: { Authorization: `Bearer ${tokenFacA}` },
      });

      const res = await getSessionsRoute(req);
      expect(res.status).toBe(200);
      const data = await res.json();

      expect(data.length).toBe(1);
      expect(data[0].id).toBe(sessionA.id);
      expect(data[0].title).toBe("Session Alpha");
      expect(data[0]._count).toBeDefined();
    });

    it("returns ALL sessions across the system for an ADMIN", async () => {
      const req = new NextRequest("http://localhost:3000/api/sessions", {
        headers: { Authorization: `Bearer ${tokenAdmin}` },
      });

      const res = await getSessionsRoute(req);
      expect(res.status).toBe(200);
      const data = await res.json();

      expect(data.length).toBe(2);
      const titles = data.map((s: any) => s.title);
      expect(titles).toContain("Session Alpha");
      expect(titles).toContain("Session Beta");
    });
  });

  describe("2. GET /api/activities/[id] (Activity Inspection & Analytics)", () => {
    it("returns activity details and computes vote statistics for polls/quizzes", async () => {
      const activity = await createActivity(sessionA.id, {
        title: "Product Knowledge Quiz",
        prompt: "Which protocol is used for real-time messaging?",
        type: "QUIZ",
        config: JSON.stringify({
          options: ["HTTP/1.1", "WebSocket", "FTP", "SMTP"],
          correctAnswer: "WebSocket",
          points: 15,
        }),
      });

      // Add a participant and submit responses
      const participant1 = await prisma.sessionParticipant.create({
        data: {
          sessionId: sessionA.id,
          displayName: "Alice",
          token: "tok_alice_123",
        },
      });

      const participant2 = await prisma.sessionParticipant.create({
        data: {
          sessionId: sessionA.id,
          displayName: "Bob",
          token: "tok_bob_123",
        },
      });

      // Activate to allow responses
      await updateActivity(activity.id, { state: "ACTIVE" });

      await submitResponse(activity.id, participant1.id, { content: "WebSocket" });
      await submitResponse(activity.id, participant2.id, { content: "WebSocket" });

      const req = new NextRequest(`http://localhost:3000/api/activities/${activity.id}`);
      const res = await getActivityRoute(req, { params: Promise.resolve({ id: activity.id }) });
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.id).toBe(activity.id);
      expect(data.title).toBe("Product Knowledge Quiz");
      expect(data.responseCount).toBe(2);
      expect(data.pollQuizStats).toBeDefined();
      expect(data.pollQuizStats.correctAnswer).toBe("WebSocket");
      expect(data.pollQuizStats.optionCounts["WebSocket"]).toBe(2);
      expect(data.pollQuizStats.optionCounts["HTTP/1.1"]).toBe(0);
      expect(data.pollQuizStats.totalVotes).toBe(2);
    });

    it("returns 404 if activity does not exist", async () => {
      const req = new NextRequest("http://localhost:3000/api/activities/non-existent-id");
      const res = await getActivityRoute(req, { params: Promise.resolve({ id: "non-existent-id" }) });
      expect(res.status).toBe(404);
    });
  });

  describe("3. PATCH /api/activities/[id] (Activity Update & Role Enforcement)", () => {
    it("allows the owning facilitator to update activity details", async () => {
      const activity = await createActivity(sessionA.id, {
        title: "Initial Title",
        prompt: "Initial Prompt",
        type: "OPEN_QUESTION",
      });

      const req = new NextRequest(`http://localhost:3000/api/activities/${activity.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenFacA}`,
        },
        body: JSON.stringify({
          title: "Updated Title",
          prompt: "Updated Prompt",
          presentationSlide: 3,
          timerSeconds: 45,
        }),
      });

      const res = await patchActivityRoute(req, { params: Promise.resolve({ id: activity.id }) });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.title).toBe("Updated Title");
      expect(data.prompt).toBe("Updated Prompt");
      expect(data.presentationSlide).toBe(3);
      expect(data.timerSeconds).toBe(45);
    });

    it("prevents Facilitator B from updating Facilitator A's activity", async () => {
      const activity = await createActivity(sessionA.id, {
        title: "Fac A Activity",
        prompt: "Prompt",
        type: "OPEN_QUESTION",
      });

      const req = new NextRequest(`http://localhost:3000/api/activities/${activity.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenFacB}`,
        },
        body: JSON.stringify({ title: "Hacked Title" }),
      });

      const res = await patchActivityRoute(req, { params: Promise.resolve({ id: activity.id }) });
      expect(res.status).toBe(403);
    });

    it("allows ADMIN to update any activity across sessions", async () => {
      const activity = await createActivity(sessionA.id, {
        title: "Fac A Activity",
        prompt: "Prompt",
        type: "OPEN_QUESTION",
      });

      const req = new NextRequest(`http://localhost:3000/api/activities/${activity.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenAdmin}`,
        },
        body: JSON.stringify({ title: "Admin Modified Title" }),
      });

      const res = await patchActivityRoute(req, { params: Promise.resolve({ id: activity.id }) });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.title).toBe("Admin Modified Title");
    });

    it("automatically completes other active activities when setting state to ACTIVE (ADR-0005)", async () => {
      const act1 = await createActivity(sessionA.id, {
        title: "Activity 1",
        prompt: "Prompt 1",
      });
      const act2 = await createActivity(sessionA.id, {
        title: "Activity 2",
        prompt: "Prompt 2",
      });

      // Set act1 to ACTIVE
      await updateActivity(act1.id, { state: "ACTIVE" });
      const checkAct1 = await prisma.activity.findUnique({ where: { id: act1.id } });
      expect(checkAct1?.state).toBe("ACTIVE");

      // Set act2 to ACTIVE via PATCH API
      const req = new NextRequest(`http://localhost:3000/api/activities/${act2.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenFacA}`,
        },
        body: JSON.stringify({ state: "ACTIVE" }),
      });

      const res = await patchActivityRoute(req, { params: Promise.resolve({ id: act2.id }) });
      expect(res.status).toBe(200);

      // Verify act1 is now COMPLETED and act2 is ACTIVE
      const updatedAct1 = await prisma.activity.findUnique({ where: { id: act1.id } });
      const updatedAct2 = await prisma.activity.findUnique({ where: { id: act2.id } });
      expect(updatedAct1?.state).toBe("COMPLETED");
      expect(updatedAct2?.state).toBe("ACTIVE");
    });
  });

  describe("4. DELETE /api/activities/[id] (Activity Deletion & Cascading)", () => {
    it("allows the owning facilitator to delete an activity and unlinks presentation mappings", async () => {
      const activity = await createActivity(sessionA.id, {
        title: "To Be Deleted",
        prompt: "Prompt",
      });

      // Create a presentation mapping pointing to this activity
      const mapping = await prisma.presentationMapping.create({
        data: {
          sessionId: sessionA.id,
          slideNumber: 2,
          title: "Checkpoint 1",
          activityId: activity.id,
        },
      });

      const req = new NextRequest(`http://localhost:3000/api/activities/${activity.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${tokenFacA}` },
      });

      const res = await deleteActivityRoute(req, { params: Promise.resolve({ id: activity.id }) });
      expect(res.status).toBe(200);

      // Activity should no longer exist
      const checkAct = await prisma.activity.findUnique({ where: { id: activity.id } });
      expect(checkAct).toBeNull();

      // Mapping should have activityId set to null
      const checkMapping = await prisma.presentationMapping.findUnique({ where: { id: mapping.id } });
      expect(checkMapping?.activityId).toBeNull();
    });

    it("prevents Facilitator B from deleting Facilitator A's activity", async () => {
      const activity = await createActivity(sessionA.id, {
        title: "Fac A Activity",
        prompt: "Prompt",
      });

      const req = new NextRequest(`http://localhost:3000/api/activities/${activity.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${tokenFacB}` },
      });

      const res = await deleteActivityRoute(req, { params: Promise.resolve({ id: activity.id }) });
      expect(res.status).toBe(403);

      const checkAct = await prisma.activity.findUnique({ where: { id: activity.id } });
      expect(checkAct).not.toBeNull();
    });

    it("allows ADMIN to delete any activity", async () => {
      const activity = await createActivity(sessionA.id, {
        title: "Fac A Activity",
        prompt: "Prompt",
      });

      const req = new NextRequest(`http://localhost:3000/api/activities/${activity.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${tokenAdmin}` },
      });

      const res = await deleteActivityRoute(req, { params: Promise.resolve({ id: activity.id }) });
      expect(res.status).toBe(200);

      const checkAct = await prisma.activity.findUnique({ where: { id: activity.id } });
      expect(checkAct).toBeNull();
    });
  });

  describe("5. getActivitiesWithStats Service", () => {
    it("returns precomputed response and whiteboard counts for a session", async () => {
      const act = await createActivity(sessionA.id, {
        title: "Brainstorm Activity",
        prompt: "Share your ideas",
      });

      const part = await prisma.sessionParticipant.create({
        data: {
          sessionId: sessionA.id,
          displayName: "Carol",
          token: "tok_carol_123",
        },
      });

      await updateActivity(act.id, { state: "ACTIVE" });
      await submitResponse(act.id, part.id, { content: "Idea 1" });
      await submitResponse(act.id, part.id, { content: "Idea 2" });

      const stats = await getActivitiesWithStats(sessionA.id);
      expect(stats.length).toBe(1);
      expect(stats[0].id).toBe(act.id);
      expect(stats[0].responseCount).toBe(2);
      expect(stats[0].whiteboardCount).toBe(0);
    });
  });
});

