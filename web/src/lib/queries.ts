// src/lib/queries.ts
import { prisma } from "@/lib/db";
import { getAccessibleFamilyIds } from "@/lib/family";

/** Upcoming events (both personal and family), soonest first. */
export async function getUpcomingEvents(userId: string, limit = 6) {
  const familyIds = await getAccessibleFamilyIds(userId);
  const orFilters = familyIds.length
    ? [{ userId }, { familyId: { in: familyIds } }]
    : [{ userId }];

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
      source: true,
    },
  });
}

/** Count summary for the dashboard. */
export async function getCounts(userId: string) {
  const familyIds = await getAccessibleFamilyIds(userId);

  const [events, accounts] = await Promise.all([
    prisma.specialDay.count({
      where: {
        OR: familyIds.length
          ? [{ userId }, { familyId: { in: familyIds } }]
          : [{ userId }],
      },
    }),
    prisma.account.count({ where: { userId } }),
  ]);

  const families = familyIds.length;
  return { events, families, accounts };
}
