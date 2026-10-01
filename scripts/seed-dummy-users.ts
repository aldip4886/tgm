import { createUser } from "../src/services/user.service";
import { prisma } from "../src/lib/db";

async function seed() {
  const dummyUsers = [
    // SUPER_ADMIN
    {
      username: "superadmin_sarah",
      password: "SuperAdminPass123",
      name: "Sarah Connor",
      email: "sarah.superadmin@training.local",
      role: "SUPER_ADMIN",
    },
    {
      username: "superadmin_david",
      password: "SuperAdminPass123",
      name: "David Bowman",
      email: "david.superadmin@training.local",
      role: "SUPER_ADMIN",
    },
    // ADMIN
    {
      username: "admin_alex",
      password: "AdminPassword123",
      name: "Alex Mercer",
      email: "alex.admin@training.local",
      role: "ADMIN",
    },
    {
      username: "admin_clara",
      password: "AdminPassword123",
      name: "Clara Vance",
      email: "clara.admin@training.local",
      role: "ADMIN",
    },
    // FACILITATOR
    {
      username: "facilitator_maya",
      password: "FacilitatorPass123",
      name: "Maya Lin",
      email: "maya.facilitator@training.local",
      role: "FACILITATOR",
    },
    {
      username: "facilitator_sam",
      password: "FacilitatorPass123",
      name: "Sam Wilson",
      email: "sam.facilitator@training.local",
      role: "FACILITATOR",
    },
    // PARTICIPANT
    {
      username: "participant_john",
      password: "ParticipantPass123",
      name: "John Doe",
      email: "john.doe@training.local",
      role: "PARTICIPANT",
    },
    {
      username: "participant_jane",
      password: "ParticipantPass123",
      name: "Jane Smith",
      email: "jane.smith@training.local",
      role: "PARTICIPANT",
    },
  ];

  for (const u of dummyUsers) {
    const existing = await prisma.user.findFirst({
      where: {
        OR: [{ username: u.username }, { email: u.email }],
      },
    });

    if (existing) {
      if (!existing.username || !existing.password) {
        const { hashPassword } = await import("../src/services/user.service");
        await prisma.user.update({
          where: { id: existing.id },
          data: {
            username: u.username,
            password: hashPassword(u.password),
            name: u.name,
            role: u.role,
          },
        });
        console.log(`Updated existing user record for ${u.username}`);
      } else {
        console.log(`User ${u.username} already exists, skipping.`);
      }
    } else {
      await createUser(u, "SUPER_ADMIN");
      console.log(`Created ${u.role}: ${u.username}`);
    }
  }

  console.log("Seeding complete!");
}

seed()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
