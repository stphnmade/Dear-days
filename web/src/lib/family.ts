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

export type UserGroup = {
  id: string;
  name: string;
  ownerId: string;
  role: "owner" | "member";
  allowMemberPosting: boolean;
  calendarLabel: string | null;
  eventNameTemplate: string | null;
};

export async function getUserGroups(userId: string): Promise<UserGroup[]> {
  const where = {
    OR: [{ ownerId: userId }, { members: { some: { joinedUserId: userId } } }],
  };
  const orderBy = { updatedAt: "desc" as const };

  try {
    const rows = await prisma.family.findMany({
      where,
      select: {
        id: true,
        name: true,
        ownerId: true,
        allowMemberPosting: true,
        calendarLabel: true,
        eventNameTemplate: true,
        updatedAt: true,
      },
      orderBy,
    });

    const mapped = rows.map((row) => ({
      id: row.id,
      name: row.name,
      ownerId: row.ownerId,
      role: row.ownerId === userId ? ("owner" as const) : ("member" as const),
      allowMemberPosting: row.allowMemberPosting,
      calendarLabel: row.calendarLabel,
      eventNameTemplate: row.eventNameTemplate,
    }));

    mapped.sort((a, b) => {
      if (a.role === b.role) return 0;
      return a.role === "owner" ? -1 : 1;
    });

    return mapped;
  } catch (error: any) {
    const msg = String(error?.message ?? "");
    const isLegacyClient =
      msg.includes("allowMemberPosting") ||
      msg.includes("calendarLabel") ||
      msg.includes("eventNameTemplate") ||
      msg.includes("Unknown field");
    if (!isLegacyClient) throw error;
  }

  const rows = await prisma.family.findMany({
    where,
    select: {
      id: true,
      name: true,
      ownerId: true,
      updatedAt: true,
    },
    orderBy,
  });

  const mapped = rows.map((row) => ({
    id: row.id,
    name: row.name,
    ownerId: row.ownerId,
    role: row.ownerId === userId ? ("owner" as const) : ("member" as const),
    allowMemberPosting: true,
    calendarLabel: null,
    eventNameTemplate: "{{title}}",
  }));

  mapped.sort((a, b) => {
    if (a.role === b.role) return 0;
    return a.role === "owner" ? -1 : 1;
  });

  return mapped;
}

export async function getAccessibleFamilyIds(userId: string): Promise<string[]> {
  const groups = await getUserGroups(userId);
  return groups.map((g) => g.id);
}

export async function getPrimaryFamilyId(userId: string): Promise<string | null> {
  const groups = await getUserGroups(userId);
  return groups[0]?.id ?? null;
}

export async function getFamilyRole(
  userId: string,
  familyId: string
): Promise<"owner" | "member" | null> {
  const row = await prisma.family.findFirst({
    where: {
      id: familyId,
      OR: [{ ownerId: userId }, { members: { some: { joinedUserId: userId } } }],
    },
    select: {
      ownerId: true,
    },
  });
  if (!row) return null;
  return row.ownerId === userId ? "owner" : "member";
}

export async function canUserAccessFamily(userId: string, familyId: string) {
  const role = await getFamilyRole(userId, familyId);
  return role !== null;
}

/** Ensure an owned family exists; return the full Family (never null). */
export async function getOrCreateDefaultFamily(
  userId: string,
  name = "My Group"
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
