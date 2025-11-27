// src/lib/family.ts
import { prisma } from "@/lib/db";

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/** Find the family owned by this user (nullable). */
export async function getOwnedFamilyId(userId: string): Promise<string | null> {
  const fam = await prisma.family.findFirst({
    where: { ownerId: userId },
    select: { id: true },
  });
  return fam?.id ?? null;
}

/** Ensure an owned family exists; return the full Family (never null). */
export async function getOrCreateDefaultFamily(
  userId: string,
  name = "My Family"
) {
  // Return the full row directly so TS knows it's Family, not {id}|null
  const existing = await prisma.family.findFirst({
    where: { owner: { id: userId } },
  });
  if (existing) return existing; // -> Family

  // Ensure the User record exists before creating a Family that references it
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    // User doesn't exist in the database; create a minimal User record
    await prisma.user.create({
      data: { id: userId },
    });
  }

  const slug = `${slugify(name)}-${userId.slice(0, 6)}`;
  return prisma.family.create({
    data: {
      name,
      slug,
      owner: { connect: { id: userId } },
    },
  }); // -> Family
}

/** Always return the owned family ID (never null). */
export async function ensureOwnedFamilyId(userId: string) {
  const fam = await getOrCreateDefaultFamily(userId);
  return fam.id; // string
}
