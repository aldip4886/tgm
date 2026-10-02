import { NextRequest, NextResponse } from "next/server";
import { createSession } from "@/services/session.service";
import { verifyFacilitatorAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const createSessionSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().optional(),
  facilitatorName: z.string().min(2, "Facilitator name is required"),
  facilitatorEmail: z.string().email("Valid email required"),
  facilitatorId: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const cookieToken = req.cookies.get("tgms_user_token")?.value;
    let authUser: any = null;

    if (authHeader || cookieToken) {
      try {
        authUser = await verifyFacilitatorAuth(req);
      } catch {}
    }

    const { searchParams } = new URL(req.url);
    const facilitatorId = searchParams.get("facilitatorId");
    const status = searchParams.get("status");

    const where: any = {};
    if (status) where.status = status;

    // If logged in as facilitator (and not admin), strictly scope by their facilitator ID
    if (authUser && authUser.role === "FACILITATOR") {
      where.OR = [
        { facilitatorId: authUser.userId },
        ...(authUser.email ? [{ facilitator: { email: authUser.email } }] : []),
        ...(authUser.username ? [{ facilitator: { username: authUser.username } }] : []),
      ];
    } else if (authUser && (authUser.role === "ADMIN" || authUser.role === "SUPER_ADMIN")) {
      // Administrator can view all sessions created by all facilitators
      if (facilitatorId) {
        where.facilitatorId = facilitatorId;
      }
    } else if (facilitatorId) {
      where.facilitatorId = facilitatorId;
    } else if (!authUser && process.env.NODE_ENV !== "test") {
      return NextResponse.json({ error: "Authentication required to view sessions" }, { status: 401 });
    }

    const sessions = await prisma.session.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        facilitator: {
          select: { id: true, name: true, email: true, username: true, role: true },
        },
        _count: {
          select: {
            activities: true,
            participants: true,
            teams: true,
          },
        },
      },
    });

    const mapped = sessions.map((s) => ({
      id: s.id,
      title: s.title,
      description: s.description,
      code: s.code,
      status: s.status,
      facilitatorId: s.facilitatorId,
      facilitator: s.facilitator,
      activityCount: s._count.activities,
      participantCount: s._count.participants,
      teamCount: s._count.teams,
      _count: s._count,
      leaderboardVisibility: s.leaderboardVisibility,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    }));

    return NextResponse.json(mapped);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch sessions" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const cookieToken = req.cookies.get("tgms_user_token")?.value;
    let authUser: any = null;

    if (authHeader || cookieToken || process.env.NODE_ENV !== "test") {
      authUser = await verifyFacilitatorAuth(req);
    }

    const body = await req.json();
    const validated = createSessionSchema.parse(body);

    if (authUser && authUser.role === "FACILITATOR") {
      if (validated.facilitatorId && validated.facilitatorId !== authUser.userId) {
        return NextResponse.json(
          { error: "Forbidden: Facilitators cannot assign sessions to another facilitator." },
          { status: 403 }
        );
      }
    }

    const targetFacilitatorId =
      authUser?.role === "ADMIN" || authUser?.role === "SUPER_ADMIN"
        ? validated.facilitatorId || authUser.userId
        : authUser?.userId;

    const session = await createSession({
      ...validated,
      facilitatorId: targetFacilitatorId,
      facilitatorUsername:
        targetFacilitatorId === authUser?.userId ? authUser?.username : undefined,
      facilitatorName: validated.facilitatorName || authUser?.username || "Facilitator",
      facilitatorEmail:
        targetFacilitatorId === authUser?.userId
          ? authUser?.email || validated.facilitatorEmail
          : validated.facilitatorEmail,
    });
    return NextResponse.json(session, { status: 201 });
  } catch (error: any) {
    const status = error.status || 400;
    return NextResponse.json(
      { error: error.message || "Failed to create session" },
      { status }
    );
  }
}


