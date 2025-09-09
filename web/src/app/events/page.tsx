import Link from "next/link";
import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { deleteEvent } from "./new/actions";
import SubmitButton from "@/ui/SubmitButton";

export default async function EventsPage() {
  const s = await getAuthSession();
  if (!s?.user) return null;
  const userId = (s.user as any).id as string;

  const items = await prisma.specialDay.findMany({
    where: { OR: [{ userId }, { family: { owner: { id: userId } } }] },
    orderBy: { date: "asc" },
  });

  return (
    <main className="mx-auto max-w-3xl p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Events</h1>
        <Link
          href="/events/new"
          className="rounded-xl px-3 py-2 bg-slate-900 text-white dark:bg-white dark:text-slate-900"
        >
          Add
        </Link>
      </div>
      <ul className="mt-6 space-y-2">
        {items.map((ev) => (
          <li
            key={ev.id}
            className="flex items-center justify-between rounded-xl border px-4 py-3"
          >
            <div>
              <div className="font-medium">
                {ev.title ?? ev.person ?? "Special Day"}
              </div>
              <div className="text-xs text-slate-500">
                {new Date(ev.date).toLocaleDateString()} · {ev.type}
              </div>
            </div>
            <div className="flex gap-2">
              <Link
                href={`/events/${ev.id}/edit`}
                className="text-sm underline"
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
