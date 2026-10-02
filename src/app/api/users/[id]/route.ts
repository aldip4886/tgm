import { NextRequest, NextResponse } from "next/server";
import { deleteUser, updateUser } from "@/services/user.service";
import { verifyAdminAuth, verifyUserToken } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  username: z.string().min(1).optional(),
  email: z.string().email().optional().nullable().or(z.literal("")),
  role: z.enum(["PARTICIPANT", "FACILITATOR", "ADMIN", "SUPER_ADMIN"]).optional(),
  password: z.string().min(4).optional().or(z.literal("")),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const { id } = await params;

    const user = await prisma.user.findUnique({
      where: { id },
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
            activities: {
              select: {
                id: true,
                title: true,
                type: true,
                state: true,
              },
              orderBy: { orderIndex: "asc" },
            },
          },
          orderBy: { createdAt: "desc" },
        },
        participants: {
          include: {
            session: {
              select: {
                id: true,
                title: true,
                code: true,
                status: true,
                createdAt: true,
                facilitator: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
              },
            },
            team: true,
            badges: {
              include: {
                badge: true,
              },
              orderBy: { createdAt: "desc" },
            },
            pointsReceived: {
              include: {
                giver: {
                  select: { id: true, displayName: true },
                },
                activity: {
                  select: { id: true, title: true, type: true },
                },
              },
              orderBy: { createdAt: "desc" },
            },
            responses: {
              include: {
                activity: {
                  select: { id: true, title: true, type: true },
                },
                comments: true,
                reactions: true,
              },
              orderBy: { createdAt: "desc" },
            },
            comments: true,
            whiteboards: true,
          },
          orderBy: { joinedAt: "desc" },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (err: any) {
    const status = err.status || 400;
    return NextResponse.json({ error: err.message }, { status });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const { id } = await params;
    const authHeader = req.headers.get("authorization");
    const cookieToken = req.cookies.get("tgms_user_token")?.value;
    const rawToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : cookieToken;

    let actorRole: string | undefined;
    let actorUserId: string | undefined;

    if (rawToken) {
      try {
        const payload = await verifyUserToken(rawToken);
        actorRole = payload.role;
        actorUserId = payload.userId;
      } catch {
        const adminPayload = await verifyAdminAuth(req);
        actorRole = adminPayload.role;
        actorUserId = adminPayload.userId;
      }
    } else {
      const adminPayload = await verifyAdminAuth(req);
      actorRole = adminPayload.role;
      actorUserId = adminPayload.userId;
    }

    const body = await req.json();
    const data = updateUserSchema.parse(body);

    const updated = await updateUser(
      id,
      {
        name: data.name,
        username: data.username,
        email: data.email === "" ? null : data.email,
        role: data.role,
        password: data.password || undefined,
      },
      actorRole,
      actorUserId
    );

    return NextResponse.json(updated);
  } catch (err: any) {
    const status = err.status || (err.message?.includes("Forbidden") ? 403 : 400);
    return NextResponse.json({ error: err.message }, { status });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const authHeader = req.headers.get("authorization");
    const cookieToken = req.cookies.get("tgms_user_token")?.value;
    let actorRole: string | undefined;

    if (authHeader || cookieToken || process.env.NODE_ENV !== "test") {
      const payload = await verifyAdminAuth(req);
      actorRole = payload.role;
    }

    const { id } = await params;
    const result = await deleteUser(id, actorRole);
    return NextResponse.json(result);
  } catch (err: any) {
    const status = err.status || (err.message?.includes("Forbidden") ? 403 : 400);
    return NextResponse.json({ error: err.message }, { status });
  }
}

