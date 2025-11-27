// scripts/seed-test-family.ts
// Run with: npx tsx scripts/seed-test-family.ts

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding test family...");

  // Hash a test password
  const testPassword = await bcrypt.hash("TestPass123!", 10);

  // Create dad user
  const dad = await prisma.user.upsert({
    where: { email: "dad@test.local" },
    update: {},
    create: {
      email: "dad@test.local",
      name: "Dad",
      password: testPassword,
    } as any,
  });
  console.log("✅ Created Dad:", dad.id);

  // Create mom user
  const mom = await prisma.user.upsert({
    where: { email: "mom@test.local" },
    update: {},
    create: {
      email: "mom@test.local",
      name: "Mom",
      password: testPassword,
    } as any,
  });
  console.log("✅ Created Mom:", mom.id);

  // Create cuz user
  const cuz = await prisma.user.upsert({
    where: { email: "cuz@test.local" },
    update: {},
    create: {
      email: "cuz@test.local",
      name: "Cuz",
      password: testPassword,
    } as any,
  });
  console.log("✅ Created Cuz:", cuz.id);

  // Create family owned by dad
  const family = await prisma.family.upsert({
    where: { slug: "test-family" },
    update: {},
    create: {
      name: "Test Family",
      slug: "test-family",
      ownerId: dad.id,
    },
  });
  console.log("✅ Created Family:", family.id);

  // Add dad as member (with "You" label)
  await prisma.familyMember.upsert({
    where: {
      familyId_joinedUserId: { familyId: family.id, joinedUserId: dad.id },
    } as any,
    update: {},
    create: {
      name: "You",
      familyId: family.id,
      joinedUserId: dad.id,
    },
  });
  console.log("✅ Added Dad to family as 'You'");

  // Add mom as member
  await prisma.familyMember.upsert({
    where: {
      familyId_joinedUserId: { familyId: family.id, joinedUserId: mom.id },
    } as any,
    update: {},
    create: {
      name: "Mom",
      familyId: family.id,
      joinedUserId: mom.id,
    },
  });
  console.log("✅ Added Mom to family");

  // Add cuz as member
  await prisma.familyMember.upsert({
    where: {
      familyId_joinedUserId: { familyId: family.id, joinedUserId: cuz.id },
    } as any,
    update: {},
    create: {
      name: "Cuz",
      familyId: family.id,
      joinedUserId: cuz.id,
    },
  });
  console.log("✅ Added Cuz to family");

  // Create Muffin Time event visible to all (family-level event)
  const event = await prisma.specialDay.create({
    data: {
      title: "Muffin Time",
      type: "event",
      date: new Date("2025-11-28T10:00:00Z"),
      person: "Everyone",
      notes: "Enjoy muffins together!",
      familyId: family.id,
    },
  });
  console.log("✅ Created Muffin Time event:", event.id);

  console.log("\n🎉 Test family setup complete!");
  console.log("Family ID:", family.id);
  console.log("Dad email: dad@test.local");
  console.log("Mom email: mom@test.local");
  console.log("Cuz email: cuz@test.local");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
