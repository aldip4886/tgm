import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "../src/lib/db";
import { NextRequest } from "next/server";
import {
  signUserToken,
  verifyFacilitatorAuth,
  verifyAdminAuth,
  verifySuperAdminAuth,
} from "../src/lib/auth";
import {
  createUser,
  deleteUser,
  bulkUploadUsers,
} from "../src/services/user.service";
import { createSession } from "../src/services/session.service";

describe("Roles Hierarchy and Facilitator Session Isolation", () => {
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

  describe("1. SUPER_ADMIN and ADMIN User Management Permissions", () => {
    it("allows SUPER_ADMIN to create ADMIN and SUPER_ADMIN users", async () => {
      const admin = await createUser(
        {
          username: "admin_test",
          password: "Password123",
          name: "Admin User",
          role: "ADMIN",
        },
        "SUPER_ADMIN"
      );
      expect(admin.role).toBe("ADMIN");

      const superAdmin = await createUser(
        {
          username: "super_test",
          password: "Password123",
          name: "Super Admin User",
          role: "SUPER_ADMIN",
        },
        "SUPER_ADMIN"
      );
      expect(superAdmin.role).toBe("SUPER_ADMIN");
    });

    it("prevents ADMIN from creating SUPER_ADMIN users", async () => {
      await expect(
        createUser(
          {
            username: "hacked_super",
            password: "Password123",
            name: "Hacked Super",
            role: "SUPER_ADMIN",
          },
          "ADMIN"
        )
      ).rejects.toThrow("Admins cannot create Super Admin accounts");
    });

    it("allows ADMIN to create FACILITATOR and PARTICIPANT users", async () => {
      const fac = await createUser(
        {
          username: "fac_test",
          password: "Password123",
          name: "Facilitator Test",
          role: "FACILITATOR",
        },
        "ADMIN"
      );
      expect(fac.role).toBe("FACILITATOR");

      const part = await createUser(
        {
          username: "part_test",
          password: "Password123",
          name: "Participant Test",
          role: "PARTICIPANT",
        },
        "ADMIN"
      );
      expect(part.role).toBe("PARTICIPANT");
    });

    it("prevents ADMIN from deleting SUPER_ADMIN users", async () => {
      const superAdmin = await createUser(
        {
          username: "super_boss",
          password: "Password123",
          name: "Super Boss",
          role: "SUPER_ADMIN",
        },
        "SUPER_ADMIN"
      );

      await expect(deleteUser(superAdmin.id, "ADMIN")).rejects.toThrow(
        "Admins cannot delete Super Admin accounts"
      );

      const stillExists = await prisma.user.findUnique({
        where: { id: superAdmin.id },
      });
      expect(stillExists).not.toBeNull();
    });

    it("allows SUPER_ADMIN to delete other SUPER_ADMIN users", async () => {
      const superAdmin = await createUser(
        {
          username: "super_to_delete",
          password: "Password123",
          name: "Super Delete",
          role: "SUPER_ADMIN",
        },
        "SUPER_ADMIN"
      );

      await deleteUser(superAdmin.id, "SUPER_ADMIN");

      const inDb = await prisma.user.findUnique({
        where: { id: superAdmin.id },
      });
      expect(inDb).toBeNull();
    });

    it("rejects SUPER_ADMIN in bulk CSV upload if actor is ADMIN", async () => {
      const csv = `username,password,name,role
regular_user,pass123,Regular User,PARTICIPANT
super_attempt,pass123,Attempted Super,SUPER_ADMIN`;

      const result = await bulkUploadUsers(csv, "ADMIN");
      expect(result.created).toBe(1);
      expect(result.errors.length).toBe(1);
      expect(result.errors[0].error).toContain(
        "Admins cannot create Super Admin accounts"
      );
    });

    it("allows SUPER_ADMIN in bulk CSV upload if actor is SUPER_ADMIN", async () => {
      const csv = `username,password,name,role
super_two,pass123,Super Two,SUPER_ADMIN`;

      const result = await bulkUploadUsers(csv, "SUPER_ADMIN");
      expect(result.created).toBe(1);
      expect(result.errors.length).toBe(0);
    });
  });

  describe("2. Facilitator Session Isolation & Admin Overrides", () => {
    let facA: any;
    let facB: any;
    let adminUser: any;
    let superAdminUser: any;
    let sessionA: any;
    let sessionB: any;

    beforeEach(async () => {
      facA = await createUser(
        {
          username: "fac_alpha",
          password: "Password123",
          name: "Facilitator Alpha",
          email: "alpha@test.com",
          role: "FACILITATOR",
        },
        "SUPER_ADMIN"
      );

      facB = await createUser(
        {
          username: "fac_bravo",
          password: "Password123",
          name: "Facilitator Bravo",
          email: "bravo@test.com",
          role: "FACILITATOR",
        },
        "SUPER_ADMIN"
      );

      adminUser = await createUser(
        {
          username: "admin_general",
          password: "Password123",
          name: "Admin General",
          email: "admin_general@test.com",
          role: "ADMIN",
        },
        "SUPER_ADMIN"
      );

      superAdminUser = await createUser(
        {
          username: "super_chief",
          password: "Password123",
          name: "Super Chief",
          email: "super_chief@test.com",
          role: "SUPER_ADMIN",
        },
        "SUPER_ADMIN"
      );

      // Session A owned by facA
      sessionA = await createSession({
        title: "Session Alpha",
        facilitatorEmail: facA.email,
        facilitatorName: facA.name,
      });

      // Session B owned by facB
      sessionB = await createSession({
        title: "Session Bravo",
        facilitatorEmail: facB.email,
        facilitatorName: facB.name,
      });
    });

    it("allows Facilitator A to access and modify Session A", async () => {
      const tokenA = await signUserToken({
        userId: facA.id,
        username: facA.username,
        role: "FACILITATOR",
      });

      const req = new NextRequest(
        `http://localhost:3000/api/sessions/${sessionA.id}`,
        {
          headers: { Authorization: `Bearer ${tokenA}` },
        }
      );

      const auth = await verifyFacilitatorAuth(req, sessionA.id);
      expect(auth.userId).toBe(facA.id);
      expect(auth.role).toBe("FACILITATOR");
    });

    it("strictly blocks Facilitator A from accessing or modifying Session B", async () => {
      const tokenA = await signUserToken({
        userId: facA.id,
        username: facA.username,
        role: "FACILITATOR",
      });

      const req = new NextRequest(
        `http://localhost:3000/api/sessions/${sessionB.id}`,
        {
          headers: { Authorization: `Bearer ${tokenA}` },
        }
      );

      await expect(verifyFacilitatorAuth(req, sessionB.id)).rejects.toMatchObject({
        status: 403,
        message: expect.stringContaining(
          "You can only modify sessions you created"
        ),
      });
    });

    it("allows ADMIN to access and modify any session (Session A and Session B)", async () => {
      const adminToken = await signUserToken({
        userId: adminUser.id,
        username: adminUser.username,
        role: "ADMIN",
      });

      const reqA = new NextRequest(
        `http://localhost:3000/api/sessions/${sessionA.id}`,
        {
          headers: { Authorization: `Bearer ${adminToken}` },
        }
      );
      const authA = await verifyFacilitatorAuth(reqA, sessionA.id);
      expect(authA.role).toBe("ADMIN");

      const reqB = new NextRequest(
        `http://localhost:3000/api/sessions/${sessionB.id}`,
        {
          headers: { Authorization: `Bearer ${adminToken}` },
        }
      );
      const authB = await verifyFacilitatorAuth(reqB, sessionB.id);
      expect(authB.role).toBe("ADMIN");
    });

    it("allows SUPER_ADMIN to access and modify any session (Session A and Session B)", async () => {
      const superToken = await signUserToken({
        userId: superAdminUser.id,
        username: superAdminUser.username,
        role: "SUPER_ADMIN",
      });

      const reqA = new NextRequest(
        `http://localhost:3000/api/sessions/${sessionA.id}`,
        {
          headers: { Authorization: `Bearer ${superToken}` },
        }
      );
      const authA = await verifyFacilitatorAuth(reqA, sessionA.id);
      expect(authA.role).toBe("SUPER_ADMIN");

      const reqB = new NextRequest(
        `http://localhost:3000/api/sessions/${sessionB.id}`,
        {
          headers: { Authorization: `Bearer ${superToken}` },
        }
      );
      const authB = await verifyFacilitatorAuth(reqB, sessionB.id);
      expect(authB.role).toBe("SUPER_ADMIN");
    });

    it("validates verifyAdminAuth and verifySuperAdminAuth guards", async () => {
      const facToken = await signUserToken({
        userId: facA.id,
        username: facA.username,
        role: "FACILITATOR",
      });
      const adminToken = await signUserToken({
        userId: adminUser.id,
        username: adminUser.username,
        role: "ADMIN",
      });
      const superToken = await signUserToken({
        userId: superAdminUser.id,
        username: superAdminUser.username,
        role: "SUPER_ADMIN",
      });

      const facReq = new NextRequest("http://localhost:3000/api/admin/data", {
        headers: { Authorization: `Bearer ${facToken}` },
      });
      const adminReq = new NextRequest("http://localhost:3000/api/admin/data", {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const superReq = new NextRequest("http://localhost:3000/api/admin/data", {
        headers: { Authorization: `Bearer ${superToken}` },
      });

      // verifyAdminAuth: FACILITATOR fails (403), ADMIN succeeds, SUPER_ADMIN succeeds
      await expect(verifyAdminAuth(facReq)).rejects.toMatchObject({ status: 403 });
      await expect(verifyAdminAuth(adminReq)).resolves.toMatchObject({ role: "ADMIN" });
      await expect(verifyAdminAuth(superReq)).resolves.toMatchObject({ role: "SUPER_ADMIN" });

      // verifySuperAdminAuth: FACILITATOR fails (403), ADMIN fails (403), SUPER_ADMIN succeeds
      await expect(verifySuperAdminAuth(facReq)).rejects.toMatchObject({ status: 403 });
      await expect(verifySuperAdminAuth(adminReq)).rejects.toMatchObject({ status: 403 });
      await expect(verifySuperAdminAuth(superReq)).resolves.toMatchObject({
        role: "SUPER_ADMIN",
      });
    });
  });
});
