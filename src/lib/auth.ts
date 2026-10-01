import { SignJWT, jwtVerify } from "jose";
import { prisma } from "./db";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "training-game-secret-key-for-ephemeral-tokens-32chars"
);

export interface ParticipantTokenPayload {
  participantId: string;
  sessionId: string;
  displayName: string;
}

export interface UserTokenPayload {
  userId: string;
  username: string;
  role: string;
  email?: string | null;
}

export async function signParticipantToken(payload: ParticipantTokenPayload): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(JWT_SECRET);
}

export async function verifyParticipantToken(token: string): Promise<ParticipantTokenPayload> {
  const { payload } = await jwtVerify(token, JWT_SECRET);
  return {
    participantId: payload.participantId as string,
    sessionId: payload.sessionId as string,
    displayName: payload.displayName as string,
  };
}

export async function signUserToken(payload: UserTokenPayload): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(JWT_SECRET);
}

export async function verifyUserToken(token: string): Promise<UserTokenPayload> {
  const { payload } = await jwtVerify(token, JWT_SECRET);
  return {
    userId: payload.userId as string,
    username: payload.username as string,
    role: payload.role as string,
    email: payload.email as string | null | undefined,
  };
}

export class AuthError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function verifyFacilitatorAuth(
  req: Request | { headers: { get: (name: string) => string | null } },
  sessionId?: string
): Promise<UserTokenPayload> {
  const authHeader = req.headers.get("authorization");
  let token: string | undefined;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.substring(7);
  } else if ("cookies" in req && typeof (req as any).cookies?.get === "function") {
    token = (req as any).cookies.get("tgms_user_token")?.value;
  }

  if (!token && "url" in req && typeof req.url === "string") {
    try {
      const urlObj = new URL(req.url);
      token = urlObj.searchParams.get("token") || undefined;
    } catch {
      // ignore invalid url
    }
  }

  if (!token) {
    throw new AuthError("Facilitator authentication required. Please sign in.", 401);
  }

  let payload: UserTokenPayload;
  try {
    payload = await verifyUserToken(token);
  } catch {
    throw new AuthError("Invalid or expired authentication token.", 401);
  }

  if (
    payload.role !== "FACILITATOR" &&
    payload.role !== "ADMIN" &&
    payload.role !== "SUPER_ADMIN"
  ) {
    throw new AuthError("Forbidden: Only facilitators and administrators can perform this action.", 403);
  }

  if (sessionId) {
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: { facilitator: true },
    });
    if (!session) throw new AuthError("Session not found", 404);

    // ADMIN and SUPER_ADMIN have global permissions to modify all sessions
    if (payload.role !== "ADMIN" && payload.role !== "SUPER_ADMIN") {
      const fallbackEmail = payload.username ? `${payload.username}@training.local` : null;
      const isOwner =
        session.facilitatorId === payload.userId ||
        (session.facilitator &&
          (session.facilitator.id === payload.userId ||
            (payload.email && session.facilitator.email === payload.email) ||
            (fallbackEmail && session.facilitator.email === fallbackEmail) ||
            (payload.username &&
              (session.facilitator.username === payload.username ||
                session.facilitator.name === payload.username))));

      if (!isOwner) {
        throw new AuthError("Forbidden: You can only modify sessions you created.", 403);
      }
    }
  }

  return payload;
}

export async function verifyAdminAuth(
  req: Request | { headers: { get: (name: string) => string | null } }
): Promise<UserTokenPayload> {
  const authHeader = req.headers.get("authorization");
  let token: string | undefined;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.substring(7);
  } else if ("cookies" in req && typeof (req as any).cookies?.get === "function") {
    token = (req as any).cookies.get("tgms_user_token")?.value;
  }

  if (!token) {
    throw new AuthError("Administrator authentication required. Please sign in.", 401);
  }

  let payload: UserTokenPayload;
  try {
    payload = await verifyUserToken(token);
  } catch {
    throw new AuthError("Invalid or expired authentication token.", 401);
  }

  if (payload.role !== "ADMIN" && payload.role !== "SUPER_ADMIN") {
    throw new AuthError("Forbidden: Administrator privileges required.", 403);
  }

  return payload;
}

export async function verifySuperAdminAuth(
  req: Request | { headers: { get: (name: string) => string | null } }
): Promise<UserTokenPayload> {
  const authHeader = req.headers.get("authorization");
  let token: string | undefined;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.substring(7);
  } else if ("cookies" in req && typeof (req as any).cookies?.get === "function") {
    token = (req as any).cookies.get("tgms_user_token")?.value;
  }

  if (!token) {
    throw new AuthError("Super Administrator authentication required.", 401);
  }

  let payload: UserTokenPayload;
  try {
    payload = await verifyUserToken(token);
  } catch {
    throw new AuthError("Invalid or expired authentication token.", 401);
  }

  if (payload.role !== "SUPER_ADMIN") {
    throw new AuthError("Forbidden: Super Administrator privileges required.", 403);
  }

  return payload;
}
