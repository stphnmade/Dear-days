// src/lib/family.ts
import { prisma } from "@/lib/db";

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/** Find the family owned by this user (nullable). */
export async function getOwnedFamily(userId: string) {
  return prisma.family.findFirst({
    where: { owner: { id: userId } },
  }); // -> Family | null
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
