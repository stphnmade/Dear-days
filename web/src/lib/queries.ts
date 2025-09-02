// src/lib/queries.ts
import { prisma } from "@/lib/db";
import { getOwnedFamilyId } from "@/lib/family";

/** Upcoming events (both personal and family), soonest first. */
export async function getUpcomingEvents(userId: string, limit = 6) {
  const familyId = await getOwnedFamilyId(userId);

  const orFilters = familyId ? [{ userId }, { familyId }] : [{ userId }];

  return prisma.specialDay.findMany({
    where: {
      OR: orFilters,
      date: { gte: new Date() },
    },
    orderBy: { date: "asc" },
    take: limit,
    select: {
      id: true,
      title: true,
      type: true,
      date: true,
      person: true,
      familyId: true,
      userId: true,
    },
  });
}

/** Count summary for the dashboard. */
export async function getCounts(userId: string) {
  const familyId = await getOwnedFamilyId(userId);

  const [events, families, accounts] = await Promise.all([
    prisma.specialDay.count({
      where: { OR: familyId ? [{ userId }, { familyId }] : [{ userId }] },
    }),
    familyId
      ? prisma.familyMember.count({ where: { familyId } })
      : Promise.resolve(0),
    prisma.account.count({ where: { userId } }),
  ]);

  return { events, families, accounts };
}
