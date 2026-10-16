import { PrismaClient, AdProvider, IntegrationStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 AgencyPilot Safe Bootstrap: Zero Fake Ads Policy");

  // Hash demo password securely
  const passwordHash = await bcrypt.hash("Password123!", 12);

  // 1. Create standard administrator/demo user
  const adminUser = await prisma.user.upsert({
    where: { email: "admin@agencypilot.io" },
    update: {},
    create: {
      email: "admin@agencypilot.io",
      name: "AgencyPilot Admin",
      passwordHash,
    },
  });

  // 2. Create primary workspace
  const workspace = await prisma.workspace.upsert({
    where: { slug: "primary-agency-workspace" },
    update: {},
    create: {
      name: "Primary Agency Workspace",
      slug: "primary-agency-workspace",
      ownerId: adminUser.id,
    },
  });

  // 3. Ensure Owner Membership
  await prisma.workspaceMembership.upsert({
    where: {
      workspaceId_userId: {
        workspaceId: workspace.id,
        userId: adminUser.id,
      },
    },
    update: {},
    create: {
      workspaceId: workspace.id,
      userId: adminUser.id,
      role: "OWNER",
    },
  });

  console.log("✅ Admin user and workspace provisioned.");
  console.log("ℹ️ No fake or synthetic ads inserted. Real advertising data will be populated upon linking real ad providers.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
