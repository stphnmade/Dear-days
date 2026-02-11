import { redirect } from "next/navigation";

import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/auth";
import { getCounts, getUpcomingEvents } from "@/lib/queries";
import { getUserGroups } from "@/lib/family";

import OccasionIconsBg from "@/ui/OccasionIconsBg";
import DashboardCommandCenter from "@/ui/dashboard/DashboardCommandCenter";

type DashboardEvent = {
  id: string;
  title: string | null;
  type: string | null;
  date: string;
  person: string | null;
  familyId: string | null;
  source: "MANUAL" | "GOOGLE";
};

type DashboardGroup = {
  id: string;
  name: string;
  role: "owner" | "member";
  canPost: boolean;
  memberCount: number;
  syncedCount: number;
};

export default async function Dashboard() {
  const session = await getAuthSession();
  if (!session?.user) redirect("/");

  const userId = (session.user as { id?: string }).id;
  const userName = session.user.name ?? "Friend";
  const userAvatar = session.user.image ?? undefined;

  let events: DashboardEvent[] = [];
  let groups: DashboardGroup[] = [];
  let counts = { events: 0, families: 0, accounts: 0 };

  try {
    if (userId) {
      const [upcomingRaw, countsRaw, rawGroups] = await Promise.all([
        getUpcomingEvents(userId, 48),
        getCounts(userId),
        getUserGroups(userId),
      ]);

      counts = countsRaw;

      const groupIds = rawGroups.map((g) => g.id);
      const families = groupIds.length
        ? await prisma.family.findMany({
            where: { id: { in: groupIds } },
            select: {
              id: true,
              ownerId: true,
              members: {
                select: {
                  joinedUserId: true,
                },
              },
            },
          })
        : [];

      const memberIdsByGroup = new Map<string, Set<string>>();
      const allGroupMemberIds = new Set<string>();

      for (const family of families) {
        const groupMemberIds = new Set<string>([family.ownerId]);
        for (const member of family.members) {
          if (member.joinedUserId) groupMemberIds.add(member.joinedUserId);
        }
        memberIdsByGroup.set(family.id, groupMemberIds);
        for (const id of groupMemberIds) allGroupMemberIds.add(id);
      }

      const syncedAccounts = allGroupMemberIds.size
        ? await prisma.account.findMany({
            where: {
              provider: "google",
              userId: { in: [...allGroupMemberIds] },
            },
            select: { userId: true },
            distinct: ["userId"],
          })
        : [];

      const syncedUserIds = new Set(syncedAccounts.map((row) => row.userId));

      groups = rawGroups.map((group) => {
        const memberIds = memberIdsByGroup.get(group.id) ?? new Set<string>();
        const memberCount = Math.max(1, memberIds.size || (group.role === "owner" ? 1 : 0));
        const syncedCount = [...memberIds].filter((id) => syncedUserIds.has(id)).length;

        return {
          id: group.id,
          name: group.name,
          role: group.role,
          canPost: group.role === "owner" || group.allowMemberPosting,
          memberCount,
          syncedCount,
        };
      });

      events = upcomingRaw.map((event) => ({
        id: event.id,
        title: event.title,
        type: event.type,
        date: event.date.toISOString(),
        person: event.person,
        familyId: event.familyId,
        source: event.source,
      }));
    }
  } catch (error) {
    console.error("dashboard data error", error);
  }

  return (
    <main className="relative min-h-screen overflow-x-clip bg-[#0D0D0F] text-white">
      <div className="opacity-[0.16]">
        <OccasionIconsBg />
      </div>

      <DashboardCommandCenter
        userName={userName}
        userAvatar={userAvatar}
        events={events}
        groups={groups}
        counts={counts}
      />
    </main>
  );
}
