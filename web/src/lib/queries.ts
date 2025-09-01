// lightweight Prisma helpers you can adapt to your actual schema
import { prisma } from "@/lib/db";

// Adapt the field names if your model differs.
// Assumes SpecialDay has: id, title, date (Date), type, personName, userId
export async function getUpcomingEvents(userId: string, limit = 6) {
  return prisma.specialDay.findMany({
    where: { userId, date: { gte: new Date() } },
    orderBy: { date: "asc" },
    take: limit,
  });
}

export async function getCounts(userId: string) {
  const [events, families, accounts] = await Promise.all([
    prisma.specialDay.count({ where: { userId } }),
    prisma.familyMember.count({ where: { userId } }),
    prisma.account.count({ where: { userId } }),
  ]);
  return { events, families, accounts };
}
