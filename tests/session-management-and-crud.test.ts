import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "../src/lib/db";
import { NextRequest } from "next/server";
import { signUserToken } from "../src/lib/auth";
import { createUser } from "../src/services/user.service";
import { createSession } from "../src/services/session.service";
import { createActivity } from "../src/services/activity.service";
import { GET as getSessionsRoute } from "../src/app/api/sessions/route";
import {
  GET as getSessionRoute,
  PATCH as patchSessionRoute,
  DELETE as deleteSessionRoute,
} from "../src/app/api/sessions/[id]/route";
import { GET as exportJsonRoute } from "../src/app/api/sessions/[id]/export/json/route";

describe("Session Management, Isolation & CRUD Integration", () => {
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
        username: "facilitator_alpha",
        password: "Password123",
        name: "Facilitator Alpha",
        email: "alpha@training.local",
        role: "FACILITATOR",
      },
      "SUPER_ADMIN"
    );

    facB = await createUser(
      {
        username: "facilitator_beta",
        password: "Password123",
        name: "Facilitator Beta",
        email: "beta@training.local",
        role: "FACILITATOR",
      },
      "SUPER_ADMIN"
    );

    admin = await createUser(
      {
        username: "admin_alex",
        password: "Password123",
        name: "Admin Alex",
        email: "alex.admin@training.local",
        role: "ADMIN",
      },
      "SUPER_ADMIN"
    );

    tokenFacA = await signUserToken({
      userId: facA.id,
      username: facA.username,
      role: facA.role,
      email: facA.email,
    });

    tokenFacB = await signUserToken({
      userId: facB.id,
      username: facB.username,
      role: facB.role,
      email: facB.email,
    });

    tokenAdmin = await signUserToken({
      userId: admin.id,
      username: admin.username,
      role: admin.role,
      email: admin.email,
    });

    sessionA = await createSession({
      title: "Alpha Leadership Workshop",
      description: "Leadership training session for team A",
      facilitatorEmail: facA.email,
      facilitatorName: facA.name,
      facilitatorId: facA.id,
    });

    sessionB = await createSession({
      title: "Beta Technical Bootcamp",
      description: "Engineering bootcamp for team B",
      facilitatorEmail: facB.email,
      facilitatorName: facB.name,
      facilitatorId: facB.id,
    });
  });

  describe("1. Facilitator Isolation (GET /api/sessions)", () => {
    it("facilitator view ONLY displays sessions created by them", async () => {
      const req = new NextRequest("http://localhost:3000/api/sessions", {
        headers: { Authorization: `Bearer ${tokenFacA}` },
      });

      const res = await getSessionsRoute(req);
      expect(res.status).toBe(200);
      const data = await res.json();

      expect(data.length).toBe(1);
      expect(data[0].id).toBe(sessionA.id);
      expect(data[0].title).toBe("Alpha Leadership Workshop");

      // Sessions created by other facilitators are NOT displayed
      const sessionIds = data.map((s: any) => s.id);
      expect(sessionIds).not.toContain(sessionB.id);
    });

    it("Facilitator B only sees Session B", async () => {
      const req = new NextRequest("http://localhost:3000/api/sessions", {
        headers: { Authorization: `Bearer ${tokenFacB}` },
      });

      const res = await getSessionsRoute(req);
      expect(res.status).toBe(200);
      const data = await res.json();

      expect(data.length).toBe(1);
      expect(data[0].id).toBe(sessionB.id);
      expect(data[0].title).toBe("Beta Technical Bootcamp");

      const sessionIds = data.map((s: any) => s.id);
      expect(sessionIds).not.toContain(sessionA.id);
    });
  });

  describe("2. Administrator Global Visibility (GET /api/sessions)", () => {
    it("administrator can view all sessions created by all facilitators", async () => {
      const req = new NextRequest("http://localhost:3000/api/sessions", {
        headers: { Authorization: `Bearer ${tokenAdmin}` },
      });

      const res = await getSessionsRoute(req);
      expect(res.status).toBe(200);
      const data = await res.json();

      expect(data.length).toBe(2);
      const sessionIds = data.map((s: any) => s.id);
      expect(sessionIds).toContain(sessionA.id);
      expect(sessionIds).toContain(sessionB.id);
    });

    it("administrator can filter sessions by facilitatorId", async () => {
      const req = new NextRequest(`http://localhost:3000/api/sessions?facilitatorId=${facA.id}`, {
        headers: { Authorization: `Bearer ${tokenAdmin}` },
      });

      const res = await getSessionsRoute(req);
      expect(res.status).toBe(200);
      const data = await res.json();

      expect(data.length).toBe(1);
      expect(data[0].id).toBe(sessionA.id);
    });
  });

  describe("3. Displaying Session Data & Access Control (GET /api/sessions/[id])", () => {
    it("facilitator can view full data for their own session", async () => {
      await createActivity(sessionA.id, {
        title: "Team Icebreaker",
        prompt: "Introduce your role",
      });

      const req = new NextRequest(`http://localhost:3000/api/sessions/${sessionA.id}`, {
        headers: { Authorization: `Bearer ${tokenFacA}` },
      });

      const res = await getSessionRoute(req, { params: Promise.resolve({ id: sessionA.id }) });
      expect(res.status).toBe(200);
      const data = await res.json();

      expect(data.id).toBe(sessionA.id);
      expect(data.title).toBe("Alpha Leadership Workshop");
      expect(data.activities.length).toBe(1);
      expect(data.facilitator.id).toBe(facA.id);
      expect(data._count).toBeDefined();
    });

    it("facilitator CANNOT inspect data of a session created by another facilitator", async () => {
      const req = new NextRequest(`http://localhost:3000/api/sessions/${sessionA.id}`, {
        headers: { Authorization: `Bearer ${tokenFacB}` },
      });

      const res = await getSessionRoute(req, { params: Promise.resolve({ id: sessionA.id }) });
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toContain("Forbidden");
    });

    it("administrator can inspect data of any session", async () => {
      const req = new NextRequest(`http://localhost:3000/api/sessions/${sessionA.id}`, {
        headers: { Authorization: `Bearer ${tokenAdmin}` },
      });

      const res = await getSessionRoute(req, { params: Promise.resolve({ id: sessionA.id }) });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.id).toBe(sessionA.id);
    });
  });

  describe("4. Session CRUD: Update & Delete (PATCH /api/sessions/[id], DELETE /api/sessions/[id])", () => {
    it("facilitator can update their own session", async () => {
      const req = new NextRequest(`http://localhost:3000/api/sessions/${sessionA.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenFacA}`,
        },
        body: JSON.stringify({
          title: "Updated Leadership Seminar",
          description: "Revised seminar description",
          status: "WAITING",
          canvaPresentationUrl: "https://www.canva.com/design/test",
          canvaSlideCount: 15,
        }),
      });

      const res = await patchSessionRoute(req, { params: Promise.resolve({ id: sessionA.id }) });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.title).toBe("Updated Leadership Seminar");
      expect(data.description).toBe("Revised seminar description");
      expect(data.status).toBe("WAITING");
      expect(data.canvaPresentationUrl).toBe("https://www.canva.com/design/test");
      expect(data.canvaSlideCount).toBe(15);
    });

    it("facilitator CANNOT update a session created by another facilitator", async () => {
      const req = new NextRequest(`http://localhost:3000/api/sessions/${sessionA.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenFacB}`,
        },
        body: JSON.stringify({ title: "Hacked Title" }),
      });

      const res = await patchSessionRoute(req, { params: Promise.resolve({ id: sessionA.id }) });
      expect(res.status).toBe(403);
    });

    it("administrator can update any session", async () => {
      const req = new NextRequest(`http://localhost:3000/api/sessions/${sessionA.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenAdmin}`,
        },
        body: JSON.stringify({ title: "Admin Updated Title" }),
      });

      const res = await patchSessionRoute(req, { params: Promise.resolve({ id: sessionA.id }) });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.title).toBe("Admin Updated Title");
    });

    it("facilitator can delete their own session", async () => {
      const req = new NextRequest(`http://localhost:3000/api/sessions/${sessionA.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${tokenFacA}` },
      });

      const res = await deleteSessionRoute(req, { params: Promise.resolve({ id: sessionA.id }) });
      expect(res.status).toBe(200);

      const check = await prisma.session.findUnique({ where: { id: sessionA.id } });
      expect(check).toBeNull();
    });

    it("facilitator CANNOT delete a session created by another facilitator", async () => {
      const req = new NextRequest(`http://localhost:3000/api/sessions/${sessionA.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${tokenFacB}` },
      });

      const res = await deleteSessionRoute(req, { params: Promise.resolve({ id: sessionA.id }) });
      expect(res.status).toBe(403);

      const check = await prisma.session.findUnique({ where: { id: sessionA.id } });
      expect(check).not.toBeNull();
    });

    it("administrator can delete any session", async () => {
      const req = new NextRequest(`http://localhost:3000/api/sessions/${sessionB.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${tokenAdmin}` },
      });

      const res = await deleteSessionRoute(req, { params: Promise.resolve({ id: sessionB.id }) });
      expect(res.status).toBe(200);

      const check = await prisma.session.findUnique({ where: { id: sessionB.id } });
      expect(check).toBeNull();
    });
  });

  describe("5. Session Dataset Download (GET /api/sessions/[id]/export/json)", () => {
    it("facilitator can download JSON dataset for their own session", async () => {
      const req = new NextRequest(`http://localhost:3000/api/sessions/${sessionA.id}/export/json`, {
        headers: { Authorization: `Bearer ${tokenFacA}` },
      });

      const res = await exportJsonRoute(req, { params: Promise.resolve({ id: sessionA.id }) });
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toContain("application/json");
      expect(res.headers.get("content-disposition")).toContain(`session-${sessionA.code}-dataset.json`);

      const dataset = await res.json();
      expect(dataset.session.id).toBe(sessionA.id);
      expect(dataset.session.code).toBe(sessionA.code);
    });

    it("facilitator CANNOT download dataset for another facilitator's session", async () => {
      const req = new NextRequest(`http://localhost:3000/api/sessions/${sessionA.id}/export/json`, {
        headers: { Authorization: `Bearer ${tokenFacB}` },
      });

      const res = await exportJsonRoute(req, { params: Promise.resolve({ id: sessionA.id }) });
      expect(res.status).toBe(403);
    });

    it("administrator can download dataset for any session", async () => {
      const req = new NextRequest(`http://localhost:3000/api/sessions/${sessionA.id}/export/json`, {
        headers: { Authorization: `Bearer ${tokenAdmin}` },
      });

      const res = await exportJsonRoute(req, { params: Promise.resolve({ id: sessionA.id }) });
      expect(res.status).toBe(200);
      const dataset = await res.json();
      expect(dataset.session.id).toBe(sessionA.id);
    });
  });
});

