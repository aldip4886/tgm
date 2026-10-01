import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "../src/lib/db";
import { createSession, joinSession } from "../src/services/session.service";
import {
  autoSplitParticipants,
  reassignParticipantTeam,
  getTeams,
  awardTeamPoints,
} from "../src/services/team.service";

describe("Ticket 06: Facilitator-Controlled Team Auto-Split & Team Challenges", () => {
  let session: any;
  let p1: any, p2: any, p3: any, p4: any, p5: any;

  beforeEach(async () => {
    await prisma.event.deleteMany();
    await prisma.point.deleteMany();
    await prisma.response.deleteMany();
    await prisma.sessionParticipant.deleteMany();
    await prisma.team.deleteMany();
    await prisma.session.deleteMany();
    await prisma.user.deleteMany();

    session = await createSession({
      title: "Team Innovation Challenge",
      facilitatorName: "Instructor Linda",
      facilitatorEmail: "linda@innovate.org",
    });

    const [j1, j2, j3, j4, j5] = await Promise.all([
      joinSession({ code: session.code, displayName: "Participant A" }),
      joinSession({ code: session.code, displayName: "Participant B" }),
      joinSession({ code: session.code, displayName: "Participant C" }),
      joinSession({ code: session.code, displayName: "Participant D" }),
      joinSession({ code: session.code, displayName: "Participant E" }),
    ]);

    p1 = j1.participant;
    p2 = j2.participant;
    p3 = j3.participant;
    p4 = j4.participant;
    p5 = j5.participant;
  });

  it("auto-splits participants evenly across target team count", async () => {
    const teams = await autoSplitParticipants(session.id, 2);

    expect(teams).toHaveLength(2);
    expect(teams[0].name).toBe("Team Alpha");
    expect(teams[1].name).toBe("Team Beta");

    // 5 participants divided into 2 teams -> 3 in one, 2 in the other
    const team1Members = teams[0].members;
    const team2Members = teams[1].members;
    expect(team1Members.length + team2Members.length).toBe(5);
    expect(Math.abs(team1Members.length - team2Members.length)).toBeLessThanOrEqual(1);

    // Event log
    const events = await prisma.event.findMany({
      where: { sessionId: session.id, eventType: "TEAMS_AUTO_SPLIT" },
    });
    expect(events).toHaveLength(1);
  });

  it("facilitator can manually reassign a participant to a different team", async () => {
    const teams = await autoSplitParticipants(session.id, 2);
    const targetTeam = teams[1];

    // Reassign p1 to team 2
    const updated = await reassignParticipantTeam(p1.id, targetTeam.id);
    expect(updated.teamId).toBe(targetTeam.id);

    const recheckTeams = await getTeams(session.id);
    const recheckTeam2 = recheckTeams.find((t) => t.id === targetTeam.id);
    expect(recheckTeam2?.members.some((m) => m.id === p1.id)).toBe(true);

    // Event log
    const events = await prisma.event.findMany({
      where: { sessionId: session.id, eventType: "TEAM_MEMBER_REASSIGNED" },
    });
    expect(events).toHaveLength(1);
  });

  it("awards points directly to a team and rolls up correctly", async () => {
    const teams = await autoSplitParticipants(session.id, 2);
    const targetTeam = teams[0];

    const result = await awardTeamPoints(
      session.id,
      targetTeam.id,
      50,
      "TEAM",
      "Completed group breakout challenge"
    );

    expect(result.point.amount).toBe(50);
    expect(result.team.totalPoints).toBe(50);

    const recheck = await prisma.team.findUnique({
      where: { id: targetTeam.id },
    });
    expect(recheck?.totalPoints).toBe(50);
  });
});

