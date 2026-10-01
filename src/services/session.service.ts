import { prisma } from "../lib/db";
import { generateSessionCode } from "../lib/session-code";
import { signParticipantToken, verifyParticipantToken } from "../lib/auth";
import QRCode from "qrcode";

export interface CreateSessionInput {
  title: string;
  description?: string;
  facilitatorName: string;
  facilitatorEmail: string;
}

export async function createSession(input: CreateSessionInput) {
  // Ensure facilitator user exists
  const facilitator = await prisma.user.upsert({
    where: { email: input.facilitatorEmail },
    update: { name: input.facilitatorName },
    create: {
      email: input.facilitatorEmail,
      name: input.facilitatorName,
      role: "FACILITATOR",
    },
  });

  // Generate unique 6-character code
  let code = generateSessionCode();
  let existing = await prisma.session.findUnique({ where: { code } });
  while (existing) {
    code = generateSessionCode();
    existing = await prisma.session.findUnique({ where: { code } });
  }

  // Generate QR Code data URL
  const qrCode = await QRCode.toDataURL(
    JSON.stringify({ code, type: "tgms_session_join" }),
    { width: 300, margin: 2 }
  );

  return await prisma.$transaction(async (tx) => {
    const session = await tx.session.create({
      data: {
        title: input.title,
        description: input.description,
        code,
        facilitatorId: facilitator.id,
        status: "ACTIVE",
      },
    });

    await tx.event.create({
      data: {
        sessionId: session.id,
        actorId: facilitator.id,
        eventType: "SESSION_CREATED",
        metadata: JSON.stringify({
          title: session.title,
          code: session.code,
        }),
      },
    });

    return {
      ...session,
      qrCode,
      facilitator,
    };
  });
}

export interface JoinSessionInput {
  code: string;
  displayName: string;
}

export async function joinSession(input: JoinSessionInput) {
  const normalizedCode = input.code.trim().toUpperCase();
  const session = await prisma.session.findUnique({
    where: { code: normalizedCode },
  });

  if (!session) {
    throw new Error(`Session not found with code ${normalizedCode}`);
  }

  if (session.status === "COMPLETED") {
    throw new Error("This session has concluded");
  }

  return await prisma.$transaction(async (tx) => {
    // Ephemeral participant record
    const participant = await tx.sessionParticipant.create({
      data: {
        sessionId: session.id,
        displayName: input.displayName.trim(),
        token: `temp_${Date.now()}_${Math.random()}`,
        peerPointBudget: 20,
        totalPoints: 0,
        isConnected: true,
      },
    });

    // Generate signed JWT recovery token
    const token = await signParticipantToken({
      participantId: participant.id,
      sessionId: session.id,
      displayName: participant.displayName,
    });

    // Save final token
    const updatedParticipant = await tx.sessionParticipant.update({
      where: { id: participant.id },
      data: { token },
    });

    // Transactional event log
    await tx.event.create({
      data: {
        sessionId: session.id,
        actorId: participant.id,
        eventType: "PARTICIPANT_JOINED",
        metadata: JSON.stringify({
          displayName: participant.displayName,
        }),
      },
    });

    return {
      participant: updatedParticipant,
      token,
      session,
    };
  });
}

export interface ReconnectParticipantInput {
  token: string;
}

export async function reconnectParticipant(input: ReconnectParticipantInput) {
  const payload = await verifyParticipantToken(input.token);

  const participant = await prisma.sessionParticipant.findUnique({
    where: { id: payload.participantId },
    include: {
      session: true,
      team: true,
    },
  });

  if (!participant) {
    throw new Error("Participant profile not found");
  }

  if (participant.session.status === "COMPLETED") {
    throw new Error("Session has ended");
  }

  await prisma.sessionParticipant.update({
    where: { id: participant.id },
    data: { isConnected: true },
  });

  return participant;
}

export async function getSession(sessionId: string) {
  return await prisma.session.findUnique({
    where: { id: sessionId },
    include: {
      facilitator: true,
      participants: {
        orderBy: { joinedAt: "asc" },
      },
      teams: true,
      activities: {
        orderBy: { orderIndex: "asc" },
      },
      presentationMappings: {
        orderBy: { slideNumber: "asc" },
      },
    },
  });
}
