// src/lib/queries.ts
import { prisma } from "@/lib/db";
import { getAccessibleFamilyIds } from "@/lib/family";
import { nextSpecialDayOccurrence } from "@/lib/special-day-occurrences";

/** Upcoming events (both personal and family), soonest first. */
export async function getUpcomingEvents(userId: string, limit = 6) {
  const familyIds = await getAccessibleFamilyIds(userId);
  const orFilters = familyIds.length
    ? [{ userId }, { familyId: { in: familyIds } }]
    : [{ userId }];

  const events = await prisma.specialDay.findMany({
    where: {
      OR: orFilters,
    },
    orderBy: { date: "desc" },
    take: 500,
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

  return events
    .map((event) => ({
      ...event,
      date: nextSpecialDayOccurrence(event.date, event.type),
    }))
    .filter((event) => event.date >= new Date())
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, limit);
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
