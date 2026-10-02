import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/services/user.service";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const { id } = await params;

    const participant = await prisma.sessionParticipant.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            name: true,
            email: true,
            role: true,
            createdAt: true,
            sessions: {
              select: {
                id: true,
                title: true,
                description: true,
                code: true,
                status: true,
                canvaPresentationUrl: true,
                leaderboardVisibility: true,
                createdAt: true,
                updatedAt: true,
                _count: {
                  select: {
                    participants: true,
                    teams: true,
                    activities: true,
                    points: true,
                  },
                },
              },
              orderBy: { createdAt: "desc" },
            },
          },
        },
        team: true,
        session: {
          include: {
            facilitator: {
              select: {
                id: true,
                name: true,
                email: true,
                username: true,
                role: true,
              },
            },
          },
        },
        badges: {
          include: {
            badge: true,
          },
          orderBy: { createdAt: "desc" },
        },
        pointsReceived: {
          include: {
            giver: {
              select: {
                id: true,
                displayName: true,
              },
            },
            activity: {
              select: {
                id: true,
                title: true,
                type: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        },
        pointsGiven: {
          include: {
            participant: {
              select: {
                id: true,
                displayName: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        },
        responses: {
          include: {
            activity: {
              select: {
                id: true,
                title: true,
                type: true,
              },
            },
            comments: {
              include: {
                participant: {
                  select: { id: true, displayName: true },
                },
              },
            },
            reactions: true,
            points: true,
          },
          orderBy: { createdAt: "desc" },
        },
        comments: {
          include: {
            response: {
              select: {
                id: true,
                content: true,
                activity: {
                  select: { id: true, title: true, type: true },
                },
              },
            },
          },
          orderBy: { createdAt: "desc" },
        },
        whiteboards: {
          include: {
            activity: {
              select: { id: true, title: true, type: true },
            },
          },
          orderBy: { updatedAt: "desc" },
        },
      },
    });

    if (!participant) {
      return NextResponse.json({ error: "Participant not found" }, { status: 404 });
    }

    return NextResponse.json(participant);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to load participant details" },
      { status: 400 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const existing = await prisma.sessionParticipant.findUnique({
      where: { id },
      include: { user: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Participant not found" }, { status: 404 });
    }

    const nextDisplayName = body.displayName?.trim() || body.name?.trim() || existing.displayName;

    const updatedParticipant = await prisma.sessionParticipant.update({
      where: { id },
      data: {
        displayName: nextDisplayName,
      },
      include: {
        team: true,
        user: {
          select: {
            id: true,
            username: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    if (existing.userId) {
      const userUpdateData: Record<string, any> = {};
      if (body.name?.trim() || body.displayName?.trim()) {
        userUpdateData.name = nextDisplayName;
      }
      if (body.email !== undefined) {
        userUpdateData.email = body.email ? body.email.trim().toLowerCase() : null;
      }
      if (body.username?.trim()) {
        const nextUsername = body.username.trim().toLowerCase();
        const conflict = await prisma.user.findUnique({ where: { username: nextUsername } });
        if (conflict && conflict.id !== existing.userId) {
          throw new Error(`Username '${nextUsername}' is already taken`);
        }
        userUpdateData.username = nextUsername;
      }
      if (body.password && body.password.length >= 4) {
        userUpdateData.password = hashPassword(body.password);
      }
      if (Object.keys(userUpdateData).length > 0) {
        await prisma.user.update({
          where: { id: existing.userId },
          data: userUpdateData,
        });
      }
    }

    return NextResponse.json(updatedParticipant);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to update participant profile" },
      { status: 400 }
    );
  }
}
