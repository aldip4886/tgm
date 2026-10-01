import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "../src/lib/db";
import { createSession } from "../src/services/session.service";
import { createUser } from "../src/services/user.service";
import { signUserToken, verifyUserToken, verifyFacilitatorAuth } from "../src/lib/auth";
import { NextRequest } from "next/server";
import { PATCH as updateActivityState } from "../src/app/api/activities/[id]/state/route";
import { POST as splitTeams } from "../src/app/api/sessions/[id]/teams/route";

describe("Facilitator Actions Sign-In & Access Control", () => {
  let adminUser: any;
  let facilitator1: any;
  let facilitator2: any;
  let participantUser: any;

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

    adminUser = await createUser({
      username: "admin_tester",
      password: "Password123!",
      name: "Admin Tester",
      email: "admin_tester@example.com",
      role: "ADMIN",
    });

    facilitator1 = await createUser({
      username: "fac_primary",
      password: "Password123!",
      name: "Primary Facilitator",
      email: "fac1@example.com",
      role: "FACILITATOR",
    });

    facilitator2 = await createUser({
      username: "fac_secondary",
      password: "Password123!",
      name: "Secondary Facilitator",
      email: "fac2@example.com",
      role: "FACILITATOR",
    });

    participantUser = await createUser({
      username: "participant_user",
      password: "Password123!",
      name: "Participant User",
      email: "user@example.com",
      role: "PARTICIPANT",
    });
  });

  describe("Token Generation and Verification", () => {
    it("signs and verifies valid user JWT tokens", async () => {
      const token = await signUserToken({
        userId: facilitator1.id,
        role: facilitator1.role,
        username: facilitator1.username,
      });

      const payload = await verifyUserToken(token);
      expect(payload).not.toBeNull();
      expect(payload.userId).toBe(facilitator1.id);
      expect(payload.role).toBe("FACILITATOR");
      expect(payload.username).toBe("fac_primary");
    });

    it("rejects invalid, empty, or tampered tokens", async () => {
      await expect(verifyUserToken("")).rejects.toThrow();
      await expect(verifyUserToken("invalid.token.structure")).rejects.toThrow();

      const validToken = await signUserToken({
        userId: facilitator1.id,
        role: facilitator1.role,
        username: facilitator1.username,
      });
      const tampered = validToken.slice(0, -6) + "abcdef";
      await expect(verifyUserToken(tampered)).rejects.toThrow();
    });
  });

  describe("verifyFacilitatorAuth Guard", () => {
    it("throws 401 when no token is present in request", async () => {
      const req = new NextRequest("http://localhost:3000/api/sessions");
      await expect(verifyFacilitatorAuth(req)).rejects.toMatchObject({
        status: 401,
        message: expect.stringContaining("Facilitator authentication required"),
      });
    });

    it("throws 401 when token is invalid", async () => {
      const req = new NextRequest("http://localhost:3000/api/sessions", {
        headers: { Authorization: "Bearer bogus_token_value" },
      });
      await expect(verifyFacilitatorAuth(req)).rejects.toMatchObject({
        status: 401,
        message: expect.stringContaining("Invalid or expired authentication token"),
      });
    });

    it("throws 403 when user has PARTICIPANT role", async () => {
      const token = await signUserToken({
        userId: participantUser.id,
        role: participantUser.role,
        username: participantUser.username,
      });
      const req = new NextRequest("http://localhost:3000/api/sessions", {
        headers: { Authorization: `Bearer ${token}` },
      });

      await expect(verifyFacilitatorAuth(req)).rejects.toMatchObject({
        status: 403,
        message: expect.stringContaining("Only facilitators and administrators"),
      });
    });

    it("allows ADMIN users to perform facilitator actions on any session", async () => {
      const session = await createSession({
        title: "Admin Managed Session",
        facilitatorEmail: facilitator1.email,
        facilitatorName: facilitator1.name,
      });

      const token = await signUserToken({
        userId: adminUser.id,
        role: adminUser.role,
        username: adminUser.username,
      });
      const req = new NextRequest(`http://localhost:3000/api/sessions/${session.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const auth = await verifyFacilitatorAuth(req, session.id);
      expect(auth.userId).toBe(adminUser.id);
      expect(auth.role).toBe("ADMIN");
    });

    it("allows assigned facilitator to perform actions on their session", async () => {
      const session = await createSession({
        title: "Facilitator 1 Session",
        facilitatorEmail: facilitator1.email,
        facilitatorName: facilitator1.name,
      });

      const token = await signUserToken({
        userId: facilitator1.id,
        role: facilitator1.role,
        username: facilitator1.username,
        email: facilitator1.email,
      });
      const req = new NextRequest(`http://localhost:3000/api/sessions/${session.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const auth = await verifyFacilitatorAuth(req, session.id);
      expect(auth.userId).toBe(facilitator1.id);
    });

    it("rejects another facilitator if session has a different facilitator assigned", async () => {
      const session = await createSession({
        title: "Restricted Session",
        facilitatorEmail: facilitator1.email,
        facilitatorName: facilitator1.name,
      });

      const token = await signUserToken({
        userId: facilitator2.id,
        role: facilitator2.role,
        username: facilitator2.username,
        email: facilitator2.email,
      });
      const req = new NextRequest(`http://localhost:3000/api/sessions/${session.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      await expect(verifyFacilitatorAuth(req, session.id)).rejects.toMatchObject({
        status: 403,
        message: expect.stringContaining("You can only modify sessions you created"),
      });
    });
  });

  describe("API Endpoints Protected by Facilitator Auth", () => {
    it("blocks non-facilitator from transitioning activity state", async () => {
      const session = await createSession({
        title: "Activity State Test",
        facilitatorEmail: facilitator1.email,
        facilitatorName: facilitator1.name,
      });

      const act = await prisma.activity.create({
        data: {
          sessionId: session.id,
          title: "Quiz 1",
          prompt: "What is your name?",
          state: "PENDING",
          orderIndex: 0,
        },
      });

      const partToken = await signUserToken({
        userId: participantUser.id,
        role: "PARTICIPANT",
        username: participantUser.username,
      });

      const req = new NextRequest(`http://localhost:3000/api/activities/${act.id}/state`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${partToken}`,
        },
        body: JSON.stringify({ state: "ACTIVE" }),
      });

      const res = await updateActivityState(req, { params: { id: act.id } });
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toContain("Only facilitators and administrators");
    });

    it("allows authenticated facilitator to transition activity state", async () => {
      const session = await createSession({
        title: "Activity State Test 2",
        facilitatorEmail: facilitator1.email,
        facilitatorName: facilitator1.name,
      });

      const act = await prisma.activity.create({
        data: {
          sessionId: session.id,
          title: "Quiz 2",
          prompt: "What is your favorite color?",
          state: "PENDING",
          orderIndex: 0,
        },
      });

      const facToken = await signUserToken({
        userId: facilitator1.id,
        role: "FACILITATOR",
        username: facilitator1.username,
        email: facilitator1.email,
      });

      const req = new NextRequest(`http://localhost:3000/api/activities/${act.id}/state`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${facToken}`,
        },
        body: JSON.stringify({ state: "ACTIVE" }),
      });

      const res = await updateActivityState(req, { params: { id: act.id } });
      expect(res.status).toBe(200);
      const updated = await res.json();
      expect(updated.state).toBe("ACTIVE");
    });

    it("blocks unauthorized user from splitting teams", async () => {
      const session = await createSession({
        title: "Team Split Security Test",
        facilitatorEmail: facilitator1.email,
        facilitatorName: facilitator1.name,
      });

      const partToken = await signUserToken({
        userId: participantUser.id,
        role: "PARTICIPANT",
        username: participantUser.username,
      });

      const req = new NextRequest(`http://localhost:3000/api/sessions/${session.id}/teams`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${partToken}`,
        },
        body: JSON.stringify({ teamCount: 2 }),
      });

      const res = await splitTeams(req, { params: { id: session.id } });
      expect(res.status).toBe(403);
    });
  });
});
