import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getUserGroups } from "@/lib/family";
import { leaveFamily } from "./actions";
import SubmitButton from "@/ui/SubmitButton";
import GroupsCommandCenter from "@/ui/family/GroupsCommandCenter";

type SearchParams = Promise<{ familyId?: string }>;

type Role = "admin" | "planner" | "viewer";
type SyncState = "synced" | "stale" | "pending";
type RSVPStatus = "confirmed" | "tentative" | "declined" | "no_response";

type NormalizedMember = {
  id: string;
  userId: string | null;
  name: string;
  email: string | null;
  role: Role;
  syncState: SyncState;
  lastSyncAt: string | null;
  availability: number[];
};

function dayKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export default async function FamilyPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await getAuthSession();
  if (!session?.user) redirect("/");
  const userId = (session.user as any).id as string;
  const { familyId: requestedFamilyId } = await searchParams;

  const groups = await getUserGroups(userId);
  if (!groups.length) {
    return (
      <main className="mx-auto w-[92%] max-w-4xl p-6 dd-page">
        <div className="rounded-2xl p-6 dd-card">
          <h1 className="text-2xl font-semibold">Groups</h1>
          <p className="mt-2 text-sm dd-text-muted">
            You are not a member of any groups yet. Create your first event or accept an invite to get started.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/dashboard" className="rounded-xl px-4 py-2 text-sm dd-btn-neutral">
              Back to Dashboard
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const activeGroup = groups.find((group) => group.id === requestedFamilyId) ?? groups[0];
  const family = await prisma.family.findUnique({
    where: { id: activeGroup.id },
    include: {
      owner: { select: { id: true, name: true, email: true } },
      members: {
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!family) redirect("/dashboard");

  const isOwner = family.ownerId === userId;
  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  const sevenDays = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(startOfToday);
    date.setDate(startOfToday.getDate() + index);
    return date;
  });
  const dayKeys = sevenDays.map((date) => dayKey(date));

  const normalizedMembersBase = family.members.map((member) => {
    const isAdmin = member.joinedUserId === family.ownerId;
    return {
      id: member.id,
      userId: member.joinedUserId,
      name: member.user?.name ?? member.name ?? "Member",
      email: member.user?.email ?? member.email ?? null,
      role: isAdmin ? ("admin" as const) : family.allowMemberPosting ? ("planner" as const) : ("viewer" as const),
    };
  });

  if (!normalizedMembersBase.some((member) => member.userId === family.ownerId)) {
    normalizedMembersBase.unshift({
      id: `owner-${family.ownerId}`,
      userId: family.ownerId,
      name: family.owner.name ?? "Owner",
      email: family.owner.email ?? null,
      role: "admin",
    });
  }

  const memberUserIds = [...new Set(normalizedMembersBase.map((member) => member.userId).filter(Boolean))] as string[];

  const upcomingEventsRaw = await prisma.specialDay.findMany({
    where: { familyId: family.id, date: { gte: startOfToday } },
    select: { id: true, title: true, type: true, date: true, person: true },
    orderBy: { date: "asc" },
    take: 8,
  });

  const pendingInvites = isOwner
    ? await prisma.invitation.findMany({
        where: { familyId: family.id, status: "pending" },
        select: { id: true, email: true, token: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 20,
      })
    : [];

  const syncUsers = memberUserIds.length
    ? await prisma.user.findMany({
        where: { id: { in: memberUserIds } },
        select: { id: true, lastGlobalRefreshAt: true },
      })
    : [];

  const googleAccounts = memberUserIds.length
    ? await prisma.account.findMany({
        where: { userId: { in: memberUserIds }, provider: "google" },
        select: { userId: true },
      })
    : [];

  const heatmapWindowEnd = new Date(startOfToday);
  heatmapWindowEnd.setDate(heatmapWindowEnd.getDate() + 6);
  heatmapWindowEnd.setHours(23, 59, 59, 999);

  const furthestEventDate = upcomingEventsRaw[upcomingEventsRaw.length - 1]?.date ?? heatmapWindowEnd;
  const personalBusyEnd = new Date(Math.max(heatmapWindowEnd.getTime(), furthestEventDate.getTime()));
  personalBusyEnd.setHours(23, 59, 59, 999);

  const personalBusy = memberUserIds.length
    ? await prisma.specialDay.findMany({
        where: {
          userId: { in: memberUserIds },
          familyId: null,
          date: { gte: startOfToday, lte: personalBusyEnd },
        },
        select: { userId: true, title: true, date: true },
      })
    : [];

  const recentSyncWindowMs = 1000 * 60 * 60 * 24 * 7;
  const googleUserIds = new Set(googleAccounts.map((account) => account.userId));
  const syncByUserId = new Map(syncUsers.map((user) => [user.id, user.lastGlobalRefreshAt]));

  const familyEventsByDay = new Map<string, number>(dayKeys.map((key) => [key, 0]));
  for (const event of upcomingEventsRaw) {
    const key = dayKey(event.date);
    if (!familyEventsByDay.has(key)) continue;
    familyEventsByDay.set(key, (familyEventsByDay.get(key) ?? 0) + 1);
  }

  const personalBusyByUserDay = new Map<string, { count: number; titles: string[] }>();
  for (const event of personalBusy) {
    if (!event.userId) continue;
    const key = `${event.userId}|${dayKey(event.date)}`;
    const existing = personalBusyByUserDay.get(key) ?? { count: 0, titles: [] };
    existing.count += 1;
    if (event.title && existing.titles.length < 3) existing.titles.push(event.title);
    personalBusyByUserDay.set(key, existing);
  }

  const members: NormalizedMember[] = normalizedMembersBase.map((member) => {
    const hasGoogle = member.userId ? googleUserIds.has(member.userId) : false;
    const lastSync = member.userId ? syncByUserId.get(member.userId) ?? null : null;
    const hasFreshSync =
      !!lastSync && hasGoogle && now.getTime() - lastSync.getTime() <= recentSyncWindowMs;

    const syncState: SyncState = member.userId
      ? hasFreshSync
        ? "synced"
        : "stale"
      : "pending";

    const availability = dayKeys.map((key, index) => {
      const personalConflicts = member.userId
        ? personalBusyByUserDay.get(`${member.userId}|${key}`)?.count ?? 0
        : 1;
      const familyLoad = familyEventsByDay.get(key) ?? 0;
      const baseScore =
        syncState === "synced" ? 84 : syncState === "stale" ? 56 : 40;
      const roleBonus = member.role === "admin" ? 4 : member.role === "planner" ? 2 : 0;
      const weekdayAdjustment = index === 2 ? 4 : index === 5 ? -3 : 0;
      const score = baseScore + roleBonus + weekdayAdjustment - personalConflicts * 18 - familyLoad * 7;
      return clamp(Math.round(score), 10, 97);
    });

    return {
      id: member.id,
      userId: member.userId,
      name: member.name,
      email: member.email,
      role: member.role,
      syncState,
      lastSyncAt: lastSync ? lastSync.toISOString() : null,
      availability,
    };
  });

  const totalMembers = members.length;
  const syncedCount = members.filter((member) => member.syncState === "synced").length;

  const dayFormatter = new Intl.DateTimeFormat("en-US", { weekday: "short" });
  const shortDateFormatter = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });
  const fullDayFormatter = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  const heatmap = sevenDays.map((date, index) => {
    const key = dayKeys[index];
    const score = totalMembers
      ? Math.round(
          members.reduce((sum, member) => sum + member.availability[index], 0) /
            totalMembers
        )
      : 0;
    const freeCount = totalMembers
      ? clamp(Math.round((score / 100) * totalMembers), 0, totalMembers)
      : 0;

    return {
      dayKey: key,
      label: dayFormatter.format(date),
      shortDate: shortDateFormatter.format(date),
      score,
      freeCount,
    };
  });

  const slotWeights = [0.92, 1, 0.88] as const;
  const slotNames = ["Morning", "Afternoon", "Evening"] as const;

  const slotCandidates = heatmap.flatMap((day) => {
    const familyLoad = familyEventsByDay.get(day.dayKey) ?? 0;
    return slotNames.map((slotName, slotIndex) => {
      const score = clamp(
        Math.round(day.score * slotWeights[slotIndex] - familyLoad * 3 + (slotName === "Afternoon" ? 3 : 0)),
        9,
        98
      );

      return {
        id: `${day.dayKey}-${slotName.toLowerCase()}`,
        dayKey: day.dayKey,
        label: fullDayFormatter.format(new Date(`${day.dayKey}T12:00:00`)),
        slotName,
        score,
      };
    });
  });

  slotCandidates.sort((a, b) => b.score - a.score);

  const bestSlot = slotCandidates[0] ?? {
    id: `${dayKeys[0]}-afternoon`,
    dayKey: dayKeys[0],
    label: fullDayFormatter.format(sevenDays[0]),
    slotName: "Afternoon" as const,
    score: 0,
  };

  const proposedSlots = slotCandidates.slice(0, 3);

  const nudgeQueue = [
    ...pendingInvites.map((invite) => ({
      id: `invite-${invite.id}`,
      name: invite.email ?? `Pending invite · ${invite.token.slice(0, 6)}`,
      reason: "Invitation pending acceptance",
      kind: "invite" as const,
    })),
    ...members
      .filter((member) => member.syncState !== "synced")
      .map((member) => {
        const reason = !member.userId
          ? "Invite accepted but account not linked"
          : googleUserIds.has(member.userId)
          ? "Calendar sync expired"
          : "Google calendar not connected";

        return {
          id: `sync-${member.id}`,
          name: member.name,
          reason,
          kind: "sync" as const,
        };
      }),
  ];

  const upcomingEvents = upcomingEventsRaw.map((event) => {
    const eventDay = dayKey(event.date);
    const matrix = members.map((member) => {
      const conflict = member.userId
        ? personalBusyByUserDay.get(`${member.userId}|${eventDay}`)
        : undefined;
      const conflictCount = conflict?.count ?? 0;

      let status: RSVPStatus;
      if (conflictCount >= 2) status = "declined";
      else if (conflictCount === 1) status = "tentative";
      else if (member.syncState === "synced") status = "confirmed";
      else status = "no_response";

      const reason =
        status === "declined" || status === "tentative"
          ? conflict?.titles[0]
            ? `Conflict with '${conflict.titles[0]}' calendar`
            : "Calendar conflict"
          : null;

      return {
        memberId: member.id,
        name: member.name,
        status,
        reason,
      };
    });

    const confirmedNames = matrix
      .filter((row) => row.status === "confirmed")
      .map((row) => row.name);

    return {
      id: event.id,
      title: event.title,
      type: event.type,
      dateIso: event.date.toISOString(),
      person: event.person,
      matrix,
      confirmedCount: confirmedNames.length,
      attendanceSummaryNames: confirmedNames.slice(0, 6),
    };
  });

  const eventGroups = groups.map((group) => ({
    id: group.id,
    name: group.name,
    canPost: group.role === "owner" || group.allowMemberPosting,
  }));
  const inviteGroups = groups.map((group) => ({ id: group.id, name: group.name }));

  return (
    <main className="mx-auto w-[92%] max-w-7xl p-6 dd-page">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Groups</h1>
          <p className="text-sm dd-text-muted">
            Active group · {isOwner ? "Owner" : "Member"} · {totalMembers} members
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link href="/dashboard" className="rounded-xl px-3 py-2 text-sm dd-btn-neutral">
            Dashboard
          </Link>
          <Link
            href={`/connections?familyId=${encodeURIComponent(family.id)}`}
            className="rounded-xl px-3 py-2 text-sm dd-btn-neutral"
          >
            Connections
          </Link>
          {isOwner ? (
            <Link
              href={`/family/${family.id}/manage`}
              className="rounded-xl px-3 py-2 text-sm dd-btn-neutral"
            >
              Permissions
            </Link>
          ) : (
            <form action={leaveFamily.bind(null, family.id)}>
              <SubmitButton theme="danger">Leave group</SubmitButton>
            </form>
          )}
        </div>
      </div>

      <GroupsCommandCenter
        familyId={family.id}
        familyName={family.name}
        isOwner={isOwner}
        groups={groups.map((group) => ({
          id: group.id,
          name: group.name,
          role: group.role,
        }))}
        inviteGroups={inviteGroups}
        eventGroups={eventGroups}
        heatmap={heatmap}
        bestSlot={{
          dayKey: bestSlot.dayKey,
          label: bestSlot.label,
          slotName: bestSlot.slotName,
          score: bestSlot.score,
        }}
        proposedSlots={proposedSlots}
        members={members}
        syncedCount={syncedCount}
        nudgeQueue={nudgeQueue}
        upcomingEvents={upcomingEvents}
      />
    </main>
  );
}
