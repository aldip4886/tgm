import crypto from "crypto";
import { prisma } from "../lib/db";
import { signParticipantToken, signUserToken } from "../lib/auth";

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  if (!storedHash) return false;
  const [salt, key] = storedHash.split(":");
  if (!salt || !key) return false;
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
  return hash === key;
}

export interface CreateUserInput {
  username: string;
  password: string;
  name: string;
  email?: string;
  role?: string;
}

export async function createUser(input: CreateUserInput, actorRole?: string) {
  if (actorRole === "FACILITATOR") {
    throw new Error("Forbidden: Facilitators cannot create or modify user accounts. Only Administrators can do this.");
  }

  const username = input.username.trim().toLowerCase();
  if (!username) throw new Error("Username is required");
  if (!input.password || input.password.length < 4) {
    throw new Error("Password must be at least 4 characters");
  }
  if (!input.name?.trim()) throw new Error("Name is required");

  const targetRole = input.role?.toUpperCase() || "PARTICIPANT";

  // ADMIN can create all roles EXCEPT SUPER_ADMIN. SUPER_ADMIN can create any role.
  if (targetRole === "SUPER_ADMIN" && actorRole !== "SUPER_ADMIN") {
    throw new Error("Forbidden: Admins cannot create Super Admin accounts");
  }

  const existing = await prisma.user.findFirst({
    where: {
      OR: [
        { username },
        ...(input.email ? [{ email: input.email.trim().toLowerCase() }] : []),
      ],
    },
  });

  if (existing) {
    if (existing.username === username) {
      throw new Error(`Username '${username}' is already taken`);
    }
    throw new Error(`Email '${input.email}' is already registered`);
  }

  const hashedPassword = hashPassword(input.password);

  const user = await prisma.user.create({
    data: {
      username,
      password: hashedPassword,
      name: input.name.trim(),
      email: input.email ? input.email.trim().toLowerCase() : null,
      role: targetRole,
    },
  });

  const { password: _, ...sanitized } = user;
  return sanitized;
}

export interface UpdateUserInput {
  name?: string;
  username?: string;
  email?: string | null;
  role?: string;
  password?: string;
}

export async function updateUser(
  userId: string,
  input: UpdateUserInput,
  actorRole?: string,
  actorUserId?: string
) {
  const isSelfEdit = Boolean(actorUserId && actorUserId === userId);
  const isAdmin = actorRole === "ADMIN" || actorRole === "SUPER_ADMIN";

  if (!isAdmin && !isSelfEdit) {
    throw new Error("Forbidden: Facilitators cannot change user accounts. Only Administrators can do this.");
  }

  const existing = await prisma.user.findUnique({ where: { id: userId } });
  if (!existing) throw new Error("User not found");

  if (!isSelfEdit && existing.role === "SUPER_ADMIN" && actorRole !== "SUPER_ADMIN") {
    throw new Error("Forbidden: Only a Super Admin can modify a Super Admin account");
  }

  const targetRole = isAdmin && input.role ? input.role.toUpperCase() : existing.role;
  if (targetRole === "SUPER_ADMIN" && actorRole !== "SUPER_ADMIN") {
    throw new Error("Forbidden: Admins cannot promote users to Super Admin");
  }

  let normalizedUsername: string | undefined = undefined;
  if (input.username !== undefined && input.username.trim()) {
    normalizedUsername = input.username.trim().toLowerCase();
    if (normalizedUsername !== existing.username) {
      const taken = await prisma.user.findUnique({ where: { username: normalizedUsername } });
      if (taken && taken.id !== userId) {
        throw new Error(`Username '${normalizedUsername}' is already taken`);
      }
    }
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      name: input.name !== undefined ? input.name.trim() : undefined,
      username: normalizedUsername,
      email: input.email !== undefined ? (input.email ? input.email.trim().toLowerCase() : null) : undefined,
      role: targetRole,
      ...(input.password && input.password.length >= 4 ? { password: hashPassword(input.password) } : {}),
    },
  });

  // Also keep displayName synced in active sessions if user updates their own name
  if (input.name && input.name.trim()) {
    await prisma.sessionParticipant.updateMany({
      where: { userId },
      data: { displayName: input.name.trim() },
    });
  }

  const { password: _, ...sanitized } = updated;
  return sanitized;
}

export async function listUsers() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      username: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      _count: {
        select: {
          participants: true,
          sessions: true,
        },
      },
    },
  });
  return users;
}

export async function deleteUser(userId: string, actorRole?: string) {
  if (actorRole === "FACILITATOR") {
    throw new Error("Forbidden: Facilitators cannot delete user accounts. Only Administrators can do this.");
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });
  if (!user) throw new Error("User not found");

  if (user.role === "SUPER_ADMIN" && actorRole !== "SUPER_ADMIN") {
    throw new Error("Forbidden: Admins cannot delete Super Admin accounts");
  }

  await prisma.user.delete({
    where: { id: userId },
  });

  return { success: true, id: userId };
}

export interface BulkUploadResult {
  total: number;
  created: number;
  updated: number;
  errors: { row: number; username?: string; error: string }[];
}

export async function bulkUploadUsers(csvContent: string, actorRole?: string): Promise<BulkUploadResult> {
  if (actorRole === "FACILITATOR") {
    throw new Error("Forbidden: Facilitators cannot bulk upload or modify user accounts. Only Administrators can do this.");
  }
  const lines = csvContent
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) {
    return { total: 0, created: 0, updated: 0, errors: [] };
  }

  // Detect header row
  let startIndex = 0;
  const firstLine = lines[0].toLowerCase();
  if (firstLine.includes("username") || firstLine.includes("name")) {
    startIndex = 1;
  }

  const result: BulkUploadResult = {
    total: lines.length - startIndex,
    created: 0,
    updated: 0,
    errors: [],
  };

  for (let i = startIndex; i < lines.length; i++) {
    const rowNumber = i + 1;
    const line = lines[i];

    // Split on comma or semicolon or tab
    const parts = line.split(/[,;\t]/).map((p) => p.trim().replace(/^["']|["']$/g, ""));
    const [rawUsername, rawPassword, rawName, rawRole, rawEmail] = parts;

    if (!rawUsername || !rawPassword) {
      result.errors.push({
        row: rowNumber,
        username: rawUsername,
        error: "Missing required username or password",
      });
      continue;
    }

    const username = rawUsername.toLowerCase();
    const name = rawName || rawUsername;
    const role = rawRole ? rawRole.toUpperCase() : "PARTICIPANT";
    const email = rawEmail ? rawEmail.toLowerCase() : null;

    if (role === "SUPER_ADMIN" && actorRole !== "SUPER_ADMIN") {
      result.errors.push({
        row: rowNumber,
        username,
        error: "Forbidden: Admins cannot create Super Admin accounts",
      });
      continue;
    }

    try {
      const existing = await prisma.user.findUnique({
        where: { username },
      });

      if (existing) {
        // Update password and details
        await prisma.user.update({
          where: { username },
          data: {
            password: hashPassword(rawPassword),
            name,
            role,
            ...(email ? { email } : {}),
          },
        });
        result.updated++;
      } else {
        await prisma.user.create({
          data: {
            username,
            password: hashPassword(rawPassword),
            name,
            role,
            email,
          },
        });
        result.created++;
      }
    } catch (err: any) {
      result.errors.push({
        row: rowNumber,
        username,
        error: err.message || "Failed to process row",
      });
    }
  }

  return result;
}

export interface AssignUserToSessionInput {
  userId: string;
  sessionId: string;
  teamId?: string | null;
  role?: string;
}

export async function assignUserToSession(
  input: AssignUserToSessionInput,
  actorRole?: string,
  actorUserId?: string
) {
  const { userId, sessionId, teamId, role = "PARTICIPANT" } = input;

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });
  if (!user) throw new Error("User not found");

  const session = await prisma.session.findUnique({
    where: { id: sessionId },
  });
  if (!session) throw new Error("Session not found");

  // Facilitators cannot assign sessions to other facilitators (only Admin and Super Admin can)
  if (actorRole === "FACILITATOR") {
    if (
      (user.role === "FACILITATOR" || user.role === "ADMIN" || user.role === "SUPER_ADMIN") &&
      user.id !== actorUserId
    ) {
      throw new Error(
        "Forbidden: Facilitators cannot assign a session to another facilitator. Only Administrators can do this."
      );
    }
  }

  return await prisma.$transaction(async (tx) => {
    // Check if participant already exists for this user in session
    const existing = await tx.sessionParticipant.findFirst({
      where: { sessionId, userId },
    });

    if (existing) {
      const updated = await tx.sessionParticipant.update({
        where: { id: existing.id },
        data: {
          displayName: user.name,
          teamId: teamId !== undefined ? teamId : existing.teamId,
          role: role || existing.role,
          isConnected: true,
        },
      });

      const token = await signParticipantToken({
        participantId: updated.id,
        sessionId,
        displayName: updated.displayName,
      });

      await tx.sessionParticipant.update({
        where: { id: updated.id },
        data: { token },
      });

      return { participant: updated, token, session };
    }

    // Create participant
    const tempToken = `temp_${Date.now()}_${Math.random()}`;
    const participant = await tx.sessionParticipant.create({
      data: {
        sessionId,
        userId,
        displayName: user.name,
        teamId: teamId || null,
        role,
        token: tempToken,
        peerPointBudget: 20,
        totalPoints: 0,
        isConnected: true,
      },
    });

    const token = await signParticipantToken({
      participantId: participant.id,
      sessionId,
      displayName: participant.displayName,
    });

    const updatedParticipant = await tx.sessionParticipant.update({
      where: { id: participant.id },
      data: { token },
    });

    await tx.event.create({
      data: {
        sessionId,
        actorId: updatedParticipant.id,
        eventType: "PARTICIPANT_JOINED",
        metadata: JSON.stringify({
          displayName: updatedParticipant.displayName,
          username: user.username,
        }),
      },
    });

    return { participant: updatedParticipant, token, session };
  });
}

export interface AuthenticateUserInput {
  username: string;
  password: string;
  sessionCode?: string;
}

export async function authenticateUser(input: AuthenticateUserInput) {
  const username = input.username.trim().toLowerCase();
  const user = await prisma.user.findUnique({
    where: { username },
  });

  if (!user || !user.password) {
    throw new Error("Invalid username or password");
  }

  const valid = verifyPassword(input.password, user.password);
  if (!valid) {
    throw new Error("Invalid username or password");
  }

  const { password: _, ...sanitizedUser } = user;

  const userToken = await signUserToken({
    userId: user.id,
    username: user.username || username,
    role: user.role,
    email: user.email,
  });

  // If a session code is provided, join or re-authenticate into the session
  if (input.sessionCode) {
    const normalizedCode = input.sessionCode.trim().toUpperCase();
    const session = await prisma.session.findUnique({
      where: { code: normalizedCode },
    });
    if (!session) {
      throw new Error(`Session not found with code ${normalizedCode}`);
    }
    if (session.status === "COMPLETED") {
      throw new Error("This session has concluded");
    }

    const assigned = await assignUserToSession({
      userId: user.id,
      sessionId: session.id,
    });

    return {
      user: sanitizedUser,
      userToken,
      session,
      participant: assigned.participant,
      token: assigned.token,
    };
  }

  return { user: sanitizedUser, userToken, token: userToken };
}
