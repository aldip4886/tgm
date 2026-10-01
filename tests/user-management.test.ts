import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "../src/lib/db";
import { createSession } from "../src/services/session.service";
import {
  createUser,
  listUsers,
  deleteUser,
  bulkUploadUsers,
  assignUserToSession,
  authenticateUser,
  hashPassword,
  verifyPassword,
} from "../src/services/user.service";

describe("Feature 6: User Management (Upload, Add, Delete, Assign by Username & Password)", () => {
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
  });

  describe("Password Hashing & Verification", () => {
    it("hashes passwords securely with unique salt", () => {
      const pwd = "SecurePassword123";
      const h1 = hashPassword(pwd);
      const h2 = hashPassword(pwd);

      expect(h1).not.toBe(pwd);
      expect(h1).toContain(":");
      // Salting ensures different hashes for the same password
      expect(h1).not.toBe(h2);

      expect(verifyPassword(pwd, h1)).toBe(true);
      expect(verifyPassword("WrongPassword", h1)).toBe(false);
    });
  });

  describe("User CRUD Operations", () => {
    it("creates a new user with username and hashed password", async () => {
      const user = await createUser({
        username: "alice_w",
        password: "secretpassword",
        name: "Alice Walker",
        email: "alice@example.com",
        role: "PARTICIPANT",
      });

      expect(user.id).toBeDefined();
      expect(user.username).toBe("alice_w");
      expect(user.name).toBe("Alice Walker");
      expect(user.email).toBe("alice@example.com");
      expect((user as any).password).toBeUndefined(); // Sanitized

      // Verify in DB that password is encrypted
      const dbUser = await prisma.user.findUnique({ where: { username: "alice_w" } });
      expect(dbUser?.password).toBeDefined();
      expect(dbUser?.password).not.toBe("secretpassword");
      expect(verifyPassword("secretpassword", dbUser!.password!)).toBe(true);
    });

    it("prevents duplicate usernames", async () => {
      await createUser({
        username: "bob_smith",
        password: "password123",
        name: "Bob Smith",
      });

      await expect(
        createUser({
          username: "bob_smith",
          password: "anotherpassword",
          name: "Bob 2",
        })
      ).rejects.toThrow("already taken");
    });

    it("lists all users with participant counts", async () => {
      await createUser({ username: "user1", password: "pwd1", name: "User One" });
      await createUser({ username: "user2", password: "pwd2", name: "User Two" });

      const users = await listUsers();
      expect(users.length).toBe(2);
      expect(users.some((u) => u.username === "user1")).toBe(true);
      expect(users.some((u) => u.username === "user2")).toBe(true);
    });

    it("deletes a user by id", async () => {
      const user = await createUser({ username: "temp_user", password: "password123", name: "Temp" });
      const del = await deleteUser(user.id);
      expect(del.success).toBe(true);

      const check = await prisma.user.findUnique({ where: { id: user.id } });
      expect(check).toBeNull();
    });
  });

  describe("Bulk Upload via CSV", () => {
    it("parses CSV content and creates multiple users", async () => {
      const csv = `username,password,name,role,email
john_doe,pass1234,John Doe,PARTICIPANT,john@example.com
jane_doe,pass5678,Jane Doe,PARTICIPANT,jane@example.com
facilitator_mark,adminpass,Mark Coach,FACILITATOR,mark@example.com`;

      const result = await bulkUploadUsers(csv);
      expect(result.created).toBe(3);
      expect(result.updated).toBe(0);
      expect(result.errors).toHaveLength(0);

      const dbUsers = await prisma.user.findMany();
      expect(dbUsers).toHaveLength(3);

      // Verify passwords authenticate properly
      const auth = await authenticateUser({
        username: "john_doe",
        password: "pass1234",
      });
      expect(auth.user.name).toBe("John Doe");
    });

    it("updates existing users when re-uploaded and reports errors for invalid rows", async () => {
      await createUser({ username: "existing_user", password: "oldpass", name: "Old Name" });

      const csv = `username,password,name,role
existing_user,newpass,Updated Name,PARTICIPANT
,nopass,Bad User,PARTICIPANT
valid_new,validpwd,New User,PARTICIPANT`;

      const result = await bulkUploadUsers(csv);
      expect(result.created).toBe(1);
      expect(result.updated).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].row).toBe(3); // row 3 is missing username

      // Check updated password
      const reauth = await authenticateUser({
        username: "existing_user",
        password: "newpass",
      });
      expect(reauth.user.name).toBe("Updated Name");
    });
  });

  describe("Assigning Users to Sessions & Authenticating", () => {
    it("assigns user to a session with generated participant token", async () => {
      const facilitator = await createUser({
        username: "facilitator1",
        password: "password",
        name: "Lead Fac",
        email: "lead@fac.org",
      });

      const session = await createSession({
        title: "Strategy Sprint",
        facilitatorName: facilitator.name,
        facilitatorEmail: facilitator.email!,
      });

      const participantUser = await createUser({
        username: "player1",
        password: "password123",
        name: "Player One",
      });

      const assignment = await assignUserToSession({
        userId: participantUser.id,
        sessionId: session.id,
      });

      expect(assignment.participant.userId).toBe(participantUser.id);
      expect(assignment.participant.displayName).toBe("Player One");
      expect(assignment.token).toBeDefined();

      // Check event logged
      const events = await prisma.event.findMany({
        where: { sessionId: session.id, eventType: "PARTICIPANT_JOINED" },
      });
      expect(events.length).toBeGreaterThanOrEqual(1);
    });

    it("authenticates user with credentials and joins session by session code", async () => {
      const user = await createUser({
        username: "sarah_k",
        password: "mypassword",
        name: "Sarah Connor",
      });

      const session = await createSession({
        title: "Cyber Workshop",
        facilitatorName: "Host",
        facilitatorEmail: "host@cyber.org",
      });

      const authResult = await authenticateUser({
        username: "sarah_k",
        password: "mypassword",
        sessionCode: session.code,
      });

      expect(authResult.user.username).toBe("sarah_k");
      expect(authResult.session?.id).toBe(session.id);
      expect(authResult.participant?.userId).toBe(user.id);
      expect(authResult.token).toBeDefined();

      // Re-authenticating returns the same participant
      const reAuth = await authenticateUser({
        username: "sarah_k",
        password: "mypassword",
        sessionCode: session.code,
      });
      expect(reAuth.participant?.id).toBe(authResult.participant?.id);
    });

    it("rejects invalid password", async () => {
      await createUser({
        username: "user_test",
        password: "correctpassword",
        name: "Test",
      });

      await expect(
        authenticateUser({
          username: "user_test",
          password: "wrongpassword",
        })
      ).rejects.toThrow("Invalid username or password");
    });
  });
});
