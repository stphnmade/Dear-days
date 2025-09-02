// src/lib/family.ts
import { prisma } from "@/lib/db";

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/** Find the family owned by this user (relation filter; no ownerId scalar needed in TS). */
export async function getOwnedFamily(userId: string) {
  return prisma.family.findFirst({
    where: { owner: { id: userId } }, // ✅ relation filter
    select: { id: true, name: true, slug: true },
  });
}

/** Get owned family id or null. */
export async function getOwnedFamilyId(userId: string) {
  const fam = await getOwnedFamily(userId);
  return fam?.id ?? null;
}

/** Create default family if missing (use relation connect; no ownerId in TS). */
export async function getOrCreateDefaultFamily(
  userId: string,
  name = "My Family"
) {
  const existing = await prisma.family.findFirst({
    where: { owner: { id: userId } }, // ✅ relation filter
    select: { id: true },
  });
  if (existing) {
    return prisma.family.findUnique({ where: { id: existing.id } });
  }

  const slug = `${slugify(name)}-${userId.slice(0, 6)}`;
  return prisma.family.create({
    data: {
      name,
      slug,
      owner: { connect: { id: userId } }, // ✅ relation connect (works even if unchecked ownerId type isn't present)
    },
  });
}
