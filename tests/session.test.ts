import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "../src/lib/db";
import { createSession, joinSession, reconnectParticipant, getSession } from "../src/services/session.service";
import { verifyParticipantToken } from "../src/lib/auth";

describe("Ticket 01: Foundation & Ephemeral Session Joining", () => {
  beforeEach(async () => {
    await prisma.event.deleteMany();
    await prisma.sessionParticipant.deleteMany();
    await prisma.session.deleteMany();
    await prisma.user.deleteMany();
  });

  it("facilitator can create a session with a unique 6-character code and QR code", async () => {
    const session = await createSession({
      title: "Collaborative Leadership Training",
      description: "Q4 interactive training",
      facilitatorName: "Jane Trainer",
      facilitatorEmail: "jane@training.org",
    });

    expect(session.id).toBeDefined();
    expect(session.title).toBe("Collaborative Leadership Training");
    expect(session.code).toHaveLength(6);
    expect(session.code).toMatch(/^[A-Z0-9]{6}$/);
    expect(session.qrCode).toContain("data:image/png;base64,");

    // Verify transactional event logging
    const events = await prisma.event.findMany({ where: { sessionId: session.id } });
    expect(events).toHaveLength(1);
    expect(events[0].eventType).toBe("SESSION_CREATED");
  });

  it("participant can join with session code and receives a signed recovery token", async () => {
    const session = await createSession({
      title: "Design Thinking Workshop",
      facilitatorName: "Alex Host",
      facilitatorEmail: "alex@design.org",
    });

    const joinResult = await joinSession({
      code: session.code,
      displayName: "Participant Dave",
    });

    expect(joinResult.participant.id).toBeDefined();
    expect(joinResult.participant.displayName).toBe("Participant Dave");
    expect(joinResult.participant.peerPointBudget).toBe(20);
    expect(joinResult.token).toBeDefined();

    // Verify token can be verified
    const payload = await verifyParticipantToken(joinResult.token);
    expect(payload.participantId).toBe(joinResult.participant.id);
    expect(payload.sessionId).toBe(session.id);

    // Verify event log
    const joinEvents = await prisma.event.findMany({
      where: { sessionId: session.id, eventType: "PARTICIPANT_JOINED" },
    });
    expect(joinEvents).toHaveLength(1);
    expect(joinEvents[0].actorId).toBe(joinResult.participant.id);
  });

  it("participant can seamlessly reconnect via recovery token without losing identity", async () => {
    const session = await createSession({
      title: "Agile Scrum Master Class",
      facilitatorName: "Sarah Coach",
      facilitatorEmail: "sarah@agile.org",
    });

    const joinResult = await joinSession({
      code: session.code,
      displayName: "Alice Developer",
    });

    // Reconnection using the stored token
    const reconnected = await reconnectParticipant({
      token: joinResult.token,
    });

    expect(reconnected.id).toBe(joinResult.participant.id);
    expect(reconnected.displayName).toBe("Alice Developer");
    expect(reconnected.sessionId).toBe(session.id);
  });

  it("rejects joining with an invalid session code", async () => {
    await expect(
      joinSession({
        code: "INVALID",
        displayName: "Bob",
      })
    ).rejects.toThrow("Session not found with code INVALID");
  });
});
