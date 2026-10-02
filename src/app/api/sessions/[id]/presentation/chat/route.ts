import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyParticipantToken, verifyFacilitatorAuth } from "@/lib/auth";

async function getOrCreatePresentationChatActivity(sessionId: string) {
  const existing = await prisma.activity.findFirst({
    where: {
      sessionId,
      type: "PRESENTATION_CHAT",
    },
  });
  if (existing) return existing;

  return await prisma.activity.create({
    data: {
      sessionId,
      title: "Live Presentation Chat & Q&A",
      prompt: "Live discussion, feedback, comments, points, and awards during slide presentation.",
      type: "PRESENTATION_CHAT",
      state: "COMPLETED",
      revealMode: "IMMEDIATE",
      orderIndex: 999,
    },
  });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const { id: sessionId } = await params;
    const chatActivity = await getOrCreatePresentationChatActivity(sessionId);

    const messages = await prisma.response.findMany({
      where: {
        activityId: chatActivity.id,
        isHidden: false,
      },
      include: {
        participant: true,
        team: true,
        comments: {
          where: { isHidden: false },
          include: { participant: true },
          orderBy: { createdAt: "asc" },
        },
        reactions: {
          include: { participant: true },
        },
        points: {
          include: { giver: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      activity: chatActivity,
      messages,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to load presentation chat" },
      { status: 400 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const { id: sessionId } = await params;
    const body = await req.json();
    const content = (body.content || "").trim();
    if (!content) {
      return NextResponse.json({ error: "Message content cannot be empty" }, { status: 400 });
    }

    const chatActivity = await getOrCreatePresentationChatActivity(sessionId);

    let participantId: string | null = null;
    let teamId: string | null = null;

    // 1. Try participant token
    try {
      const authHeader = req.headers.get("authorization");
      const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
      if (token) {
        const partPayload = await verifyParticipantToken(token);
        if (partPayload?.participantId) {
          const part = await prisma.sessionParticipant.findUnique({
            where: { id: partPayload.participantId },
          });
          if (part) {
            participantId = part.id;
            teamId = part.teamId;
          }
        }
      }
    } catch {
      // Fall through to facilitator auth check
    }

    // 2. If not participant token, check facilitator/admin auth
    if (!participantId) {
      await verifyFacilitatorAuth(req, sessionId);
      const session = await prisma.session.findUnique({
        where: { id: sessionId },
        include: { facilitator: true },
      });
      if (!session) {
        return NextResponse.json({ error: "Session not found" }, { status: 404 });
      }

      const facDisplayName = `${session.facilitator?.name || "Facilitator"} (Facilitator)`;
      let facPart = await prisma.sessionParticipant.findFirst({
        where: {
          sessionId,
          role: "FACILITATOR",
        },
      });
      if (!facPart) {
        facPart = await prisma.sessionParticipant.create({
          data: {
            sessionId,
            userId: session.facilitatorId,
            displayName: facDisplayName,
            role: "FACILITATOR",
            token: `fac_${sessionId}_${Date.now()}`,
            peerPointBudget: 999,
            totalPoints: 0,
            isConnected: true,
          },
        });
      }
      participantId = facPart.id;
    }

    const createdMessage = await prisma.response.create({
      data: {
        activityId: chatActivity.id,
        participantId,
        teamId,
        content,
        color: body.isFacilitator ? "FACILITATOR_CHAT" : "PRESENTATION_CHAT",
      },
      include: {
        participant: true,
        team: true,
        comments: {
          include: { participant: true },
        },
        reactions: {
          include: { participant: true },
        },
        points: true,
      },
    });

    await prisma.event.create({
      data: {
        sessionId,
        activityId: chatActivity.id,
        actorId: participantId,
        eventType: "PRESENTATION_CHAT_MESSAGE",
        targetId: createdMessage.id,
        metadata: JSON.stringify({
          content: createdMessage.content,
        }),
      },
    });

    try {
      const { getIO } = await import("@/lib/socket");
      const io = getIO();
      io.to(`session:${sessionId}`).emit("presentation:chat_updated", {
        message: createdMessage,
        type: "NEW_MESSAGE",
      });
    } catch {}

    return NextResponse.json(createdMessage, { status: 201 });
  } catch (error: any) {
    const status = error.status || 400;
    return NextResponse.json(
      { error: error.message || "Failed to post presentation chat message" },
      { status }
    );
  }
}
