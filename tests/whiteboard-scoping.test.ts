import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "../src/lib/db";
import { createSession, joinSession } from "../src/services/session.service";
import { createActivity } from "../src/services/activity.service";
import {
  getOrCreateWhiteboard,
  saveWhiteboardScene,
  submitWhiteboard,
  getWhiteboardById,
} from "../src/services/whiteboard.service";

describe("Whiteboard Scoping: Collaborative Team, Individual, and Public", () => {
  let session: any;
  let facilitatorId: string;
  let p1: any, p2: any, p3: any;
  let teamA: any, teamB: any;

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
      title: "Scoping Workshop",
      facilitatorName: "Instructor Sam",
      facilitatorEmail: "sam@workshop.org",
    });
    facilitatorId = session.facilitatorId;

    const [j1, j2, j3] = await Promise.all([
      joinSession({ code: session.code, displayName: "Participant One" }),
      joinSession({ code: session.code, displayName: "Participant Two" }),
      joinSession({ code: session.code, displayName: "Participant Three" }),
    ]);
    p1 = j1.participant;
    p2 = j2.participant;
    p3 = j3.participant;

    teamA = await prisma.team.create({
      data: { sessionId: session.id, name: "Team Alpha" },
    });
    teamB = await prisma.team.create({
      data: { sessionId: session.id, name: "Team Beta" },
    });

    await prisma.sessionParticipant.update({
      where: { id: p1.id },
      data: { teamId: teamA.id },
    });
    await prisma.sessionParticipant.update({
      where: { id: p2.id },
      data: { teamId: teamA.id },
    });
    await prisma.sessionParticipant.update({
      where: { id: p3.id },
      data: { teamId: teamB.id },
    });
  });

  describe("Feature 1: WHITEBOARD_TEAM (Collaborative Team Whiteboard)", () => {
    it("allows team members to collaborate on the same team whiteboard", async () => {
      const activity = await createActivity(session.id, {
        title: "Team Sprint Board",
        prompt: "Collaborate with your team",
        type: "WHITEBOARD_TEAM",
      });

      const wbTeamA1 = await getOrCreateWhiteboard({
        activityId: activity.id,
        actorId: p1.id,
      });

      expect(wbTeamA1.teamId).toBe(teamA.id);
      expect(wbTeamA1.participantId).toBeNull();

      // Teammate p2 accesses it and receives the identical board
      const wbTeamA2 = await getOrCreateWhiteboard({
        activityId: activity.id,
        actorId: p2.id,
      });

      expect(wbTeamA2.id).toBe(wbTeamA1.id);

      // p3 in Team B receives their own team's board
      const wbTeamB = await getOrCreateWhiteboard({
        activityId: activity.id,
        actorId: p3.id,
      });

      expect(wbTeamB.id).not.toBe(wbTeamA1.id);
      expect(wbTeamB.teamId).toBe(teamB.id);
    });

    it("prevents participants from other teams from editing or viewing team whiteboard", async () => {
      const activity = await createActivity(session.id, {
        title: "Team Sprint Board",
        prompt: "Collaborate with your team",
        type: "WHITEBOARD_TEAM",
      });

      const wbA = await getOrCreateWhiteboard({
        activityId: activity.id,
        actorId: p1.id,
      });

      // p3 belongs to Team B, trying to edit Team A's board should throw
      await expect(
        saveWhiteboardScene(wbA.id, JSON.stringify({ elements: [] }), p3.id)
      ).rejects.toThrow("Unauthorized: Only team members can edit this team whiteboard");

      // p3 trying to view Team A's board should throw
      await expect(
        getWhiteboardById(wbA.id, p3.id)
      ).rejects.toThrow("Unauthorized: Cannot view another team's whiteboard");

      // Facilitator can view and edit
      const viewByFacilitator = await getWhiteboardById(wbA.id, facilitatorId);
      expect(viewByFacilitator?.id).toBe(wbA.id);
    });

    it("rejects participants who do not belong to any team", async () => {
      const unassigned = await joinSession({ code: session.code, displayName: "Solo Person" });
      const activity = await createActivity(session.id, {
        title: "Team Sprint Board",
        prompt: "Collaborate with your team",
        type: "WHITEBOARD_TEAM",
      });

      await expect(
        getOrCreateWhiteboard({
          activityId: activity.id,
          actorId: unassigned.participant.id,
        })
      ).rejects.toThrow("Participant must belong to a team to access this team whiteboard");
    });
  });

  describe("Feature 2: WHITEBOARD_INDIVIDUAL (Individual Whiteboard)", () => {
    it("ensures each participant has a private individual whiteboard", async () => {
      const activity = await createActivity(session.id, {
        title: "Personal Reflection",
        prompt: "Draw your personal roadmap",
        type: "WHITEBOARD_INDIVIDUAL",
      });

      const wb1 = await getOrCreateWhiteboard({
        activityId: activity.id,
        actorId: p1.id,
      });

      const wb2 = await getOrCreateWhiteboard({
        activityId: activity.id,
        actorId: p2.id,
      });

      expect(wb1.participantId).toBe(p1.id);
      expect(wb1.teamId).toBeNull();
      expect(wb2.participantId).toBe(p2.id);
      expect(wb1.id).not.toBe(wb2.id);
    });

    it("prevents other participants from accessing or editing individual whiteboards", async () => {
      const activity = await createActivity(session.id, {
        title: "Personal Reflection",
        prompt: "Draw your personal roadmap",
        type: "WHITEBOARD_INDIVIDUAL",
      });

      const wb1 = await getOrCreateWhiteboard({
        activityId: activity.id,
        actorId: p1.id,
      });

      // p2 cannot edit p1's whiteboard
      await expect(
        saveWhiteboardScene(wb1.id, JSON.stringify({ elements: [] }), p2.id)
      ).rejects.toThrow("Unauthorized: You can only edit your own individual whiteboard");

      // p2 cannot submit p1's whiteboard
      await expect(
        submitWhiteboard(wb1.id, p2.id, JSON.stringify({ elements: [] }))
      ).rejects.toThrow("Unauthorized: You can only submit your own individual whiteboard");

      // p2 cannot view p1's whiteboard
      await expect(
        getWhiteboardById(wb1.id, p2.id)
      ).rejects.toThrow("Unauthorized: Cannot view another participant's individual whiteboard");

      // Facilitator can view
      const viewFacilitator = await getWhiteboardById(wb1.id, facilitatorId);
      expect(viewFacilitator?.id).toBe(wb1.id);
    });
  });

  describe("Feature 3: WHITEBOARD_PUBLIC (Public Whiteboard)", () => {
    it("allows all participants to access and contribute to a single public whiteboard", async () => {
      const activity = await createActivity(session.id, {
        title: "Townhall Brainstorm",
        prompt: "Everyone can draw here",
        type: "WHITEBOARD_PUBLIC",
      });

      const wb1 = await getOrCreateWhiteboard({
        activityId: activity.id,
        actorId: p1.id,
      });

      const wb2 = await getOrCreateWhiteboard({
        activityId: activity.id,
        actorId: p2.id,
      });

      const wb3 = await getOrCreateWhiteboard({
        activityId: activity.id,
        actorId: p3.id,
      });

      expect(wb1.id).toBe(wb2.id);
      expect(wb2.id).toBe(wb3.id);
      expect(wb1.teamId).toBeNull();
      expect(wb1.participantId).toBeNull();

      // Any participant can save
      const updated = await saveWhiteboardScene(
        wb1.id,
        JSON.stringify({ elements: [{ id: "public-elem" }] }),
        p3.id
      );
      expect(updated.sceneData).toContain("public-elem");
    });
  });
});
