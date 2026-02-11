import Link from "next/link";
import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { deleteEvent } from "./new/actions";
import SubmitButton from "@/ui/SubmitButton";
import EventCreateModal from "@/ui/EventCreateModal";
import { getUserGroups } from "@/lib/family";
import { isAllDayStoredDate } from "@/lib/event-datetime";

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
    <div className="dd-modal-root flex items-center justify-center p-4 dd-modal-backdrop">
      <div className="w-full max-w-3xl rounded-2xl p-6 shadow-xl dd-modal-panel">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Events</h1>
          <div className="flex gap-2">
            <Link
              href="/dashboard"
              className="rounded-xl px-3 py-2 text-sm dd-btn-neutral"
            >
              Close
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
        <ul className="mt-6 max-h-[68vh] space-y-2 overflow-auto pr-1">
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
                  {new Date(ev.date).toLocaleDateString()}
                  {!isAllDayStoredDate(new Date(ev.date))
                    ? ` ${new Date(ev.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                    : ""}{" "}
                  · {ev.type}
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
      </div>
    </div>
  );
}
