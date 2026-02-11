import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getUserGroups } from "@/lib/family";
import FamilyCalendar from "@/ui/FamilyCalendar";
import EventCreateModal from "@/ui/EventCreateModal";

type SearchParams = Promise<{ familyId?: string }>;

export default async function FamilyCalendarPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await getAuthSession();
  if (!session?.user) redirect("/");

  const userId = (session.user as any).id as string | undefined;
  if (!userId) redirect("/");
  const { familyId: requestedFamilyId } = await searchParams;
  const groups = await getUserGroups(userId);
  const activeGroup = groups.find((g) => g.id === requestedFamilyId) ?? groups[0];
  const filters = activeGroup
    ? [{ userId }, { familyId: activeGroup.id }]
    : [{ userId }];

  const events = await prisma.specialDay.findMany({
    where: { OR: filters },
    orderBy: { date: "asc" },
    take: 365,
    select: {
      id: true,
      title: true,
      date: true,
      person: true,
    },
  });

  const groupOptions = groups.map((g) => ({
    id: g.id,
    name: g.name,
    canPost: g.role === "owner" || g.allowMemberPosting,
  }));

  return (
    <main className="mx-auto max-w-6xl p-6 dd-page">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">
          {activeGroup ? `${activeGroup.name} Calendar` : "Calendar"}
        </h1>
        <div className="flex gap-2">
          <Link
            href="/dashboard"
            className="rounded-xl px-3 py-2 text-sm dd-btn-neutral"
          >
            Dashboard
          </Link>
          <Link
            href={activeGroup ? `/family?familyId=${encodeURIComponent(activeGroup.id)}` : "/family"}
            className="rounded-xl px-3 py-2 text-sm dd-btn-neutral"
          >
            Groups
          </Link>
          <EventCreateModal
            buttonLabel="Add date"
            buttonClassName="rounded-xl px-3 py-2 text-sm dd-btn-primary"
            groups={groupOptions}
            defaultFamilyId={activeGroup?.id}
            defaultScope={activeGroup ? "family" : "personal"}
          />
        </div>
      </div>

      <div className="mt-6">
        <FamilyCalendar events={events} />
      </div>
    </main>
  );
}
