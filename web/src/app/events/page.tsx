import Link from "next/link";
import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { deleteEvent } from "./new/actions";
import SubmitButton from "@/ui/SubmitButton";
import EventCreateModal from "@/ui/EventCreateModal";
import { getUserGroups } from "@/lib/family";

export default async function EventsPage() {
  const s = await getAuthSession();
  if (!s?.user) return null;
  const userId = (s.user as any).id as string;
  const groups = await getUserGroups(userId);
  const familyIds = groups.map((g) => g.id);

  const items = await prisma.specialDay.findMany({
    where: {
      OR: familyIds.length
        ? [{ userId }, { familyId: { in: familyIds } }]
        : [{ userId }],
    },
    orderBy: { date: "asc" },
  });

  return (
    <main className="mx-auto max-w-3xl p-6 dd-page">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Events</h1>
        <div className="flex gap-2">
          <Link
            href="/dashboard"
            className="rounded-xl px-3 py-2 text-sm dd-btn-neutral"
          >
            Back to Dashboard
          </Link>
          <EventCreateModal
            buttonLabel="Add"
            buttonClassName="rounded-xl px-3 py-2 text-sm dd-btn-primary hover:opacity-90"
            groups={groups.map((g) => ({
              id: g.id,
              name: g.name,
              canPost: g.role === "owner" || g.allowMemberPosting,
            }))}
            defaultFamilyId={groups[0]?.id}
            defaultScope={groups.length ? "family" : "personal"}
          />
        </div>
      </div>
      <ul className="mt-6 space-y-2">
        {items.map((ev) => (
          <li
            key={ev.id}
            className="flex items-center justify-between rounded-xl px-4 py-3 dd-card"
          >
            <div>
              <div className="font-medium">
                {ev.title ?? ev.person ?? "Special Day"}
              </div>
              <div className="text-xs dd-text-muted">
                {new Date(ev.date).toLocaleDateString()} · {ev.type}
                {ev.person ? ` · ${ev.person}` : ""}
                {/* @ts-ignore if source exists on your model */}
                {"source" in ev && (ev as any).source === "GOOGLE"
                  ? " · from Google"
                  : ""}
              </div>
            </div>
            <div className="flex gap-2">
              <Link
                href={`/events/${ev.id}/edit`}
                className="text-sm font-medium dd-link underline"
              >
                Edit
              </Link>
              <form action={deleteEvent.bind(null, ev.id)}>
                <SubmitButton theme="danger">Delete</SubmitButton>
              </form>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
