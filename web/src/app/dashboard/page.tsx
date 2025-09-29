// src/app/dashboard/page.tsx
import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

import { getAuthSession } from "@/lib/auth";
import { getUpcomingEvents, getCounts } from "@/lib/queries";

import GlassCard from "@/ui/GlassCard";
import DarkModeToggle from "@/ui/DarkModeToggle";
import OccasionIconsBg from "@/ui/OccasionIconsBg";
import SubmitButton from "@/ui/SubmitButton";

import { quickAddSpecialDay } from "./actions"; // server action we added earlier

const fmtDate = (d: Date | string) =>
  new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(d));

export default async function Dashboard() {
  const session = await getAuthSession();
  if (!session?.user) redirect("/");

  const userId = (session.user as any).id as string | undefined;
  const name = session.user.name ?? "Friend";
  const avatar = session.user.image ?? undefined;

  let upcoming: Array<{
    id: string;
    title: string | null;
    date: Date;
    type?: string | null;
    person?: string | null;
    notes?: string | null;
    familyId?: string | null;
    userId?: string | null;
  }> = [];
  let counts = { events: 0, families: 0, accounts: 0 };

  try {
    if (userId) {
      [upcoming, counts] = await Promise.all([
        getUpcomingEvents(userId, 6),
        getCounts(userId),
      ]);
    }
  } catch (e) {
    // non-fatal: show empty states gracefully
    console.error("dashboard data error", e);
  }

  return (
    <main className="relative min-h-screen">
      {/* soft celebratory background */}
      <OccasionIconsBg />

      {/* top bar */}
      <div className="relative z-10 mx-auto max-w-6xl px-6 pt-10 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {avatar ? (
            <Image
              src={avatar}
              alt={name}
              width={40}
              height={40}
              className="rounded-full"
            />
          ) : (
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-rose-300 to-violet-300" />
          )}
          <div>
            <div className="text-sm text-slate-500 dark:text-slate-400">
              Welcome back
            </div>
            <div className="text-lg font-semibold">{name}</div>
          </div>
        </div>
        <DarkModeToggle />
      </div>

      <section className="relative z-10 mx-auto max-w-6xl px-6 pb-20">
        {/* next celebrations chips */}
        <div className="mt-8 flex flex-wrap gap-2">
          {upcoming.length > 0 ? (
            upcoming.slice(0, 3).map((ev) => (
              <span
                key={ev.id}
                className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm
                           bg-white/70 dark:bg-slate-900/60 border border-white/60 dark:border-white/10
                           backdrop-blur-md shadow-sm"
              >
                <span aria-hidden>🎉</span>
                <span className="font-medium">
                  {ev.title ?? ev.person ?? "Special Day"}
                </span>
                <span className="text-slate-500 dark:text-slate-400">
                  {fmtDate(ev.date)}
                </span>
              </span>
            ))
          ) : (
            <span className="text-sm text-slate-600 dark:text-slate-300">
              No celebrations yet — let’s add your first one below.
            </span>
          )}
        </div>

        {/* grid */}
        <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {/* Upcoming */}
          <GlassCard accent="violet" className="text-left">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Upcoming</h2>
              <Link
                href="/events"
                className="text-sm text-violet-700 dark:text-violet-300 hover:underline"
              >
                View all
              </Link>
            </div>

            <div className="mt-4 space-y-3">
              {upcoming.length ? (
                upcoming.map((ev) => (
                  <div
                    key={ev.id}
                    className="flex items-center justify-between rounded-xl bg-white/60 dark:bg-slate-900/40 border border-white/50 dark:border-white/10 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <div className="truncate font-medium">
                        {ev.title ?? ev.person ?? "Special Day"}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {ev.type ?? "Occasion"} · {fmtDate(ev.date)}
                      </div>
                    </div>
                    <button className="text-sm rounded-lg px-3 py-1.5 bg-violet-500/90 text-white hover:bg-violet-500">
                      Send card
                    </button>
                  </div>
                ))
              ) : (
                <EmptyList
                  title="No upcoming events"
                  hint="Add birthdays, anniversaries, or import from Google Calendar."
                  action={{ label: "Add special day", href: "/events/new" }}
                />
              )}
            </div>

            {/* Quick add (server action) */}
            <form
              action={quickAddSpecialDay}
              className="mt-5 grid gap-2 sm:grid-cols-2"
            >
              <input
                name="title"
                placeholder="e.g., Mom’s Birthday"
                className="rounded-xl border px-3 py-2"
                required
              />
              <label htmlFor="type" className="sr-only">
                Occasion type
              </label>
              <select
                id="type"
                name="type"
                className="rounded-xl border px-3 py-2"
                title="Occasion type"
              >
                <option value="birthday">Birthday</option>
                <option value="anniversary">Anniversary</option>
                <option value="wedding">Wedding</option>
                <option value="other">Other</option>
              </select>
              <input
                type="date"
                name="date"
                className="rounded-xl border px-3 py-2"
                required
                placeholder="Select date"
                title="Select date"
              />
              <input
                name="person"
                placeholder="Who is it for? (optional)"
                className="rounded-xl border px-3 py-2 sm:col-span-2"
              />
              <textarea
                name="notes"
                placeholder="Notes (optional)"
                className="rounded-xl border px-3 py-2 sm:col-span-2"
              />
              <SubmitButton>Add</SubmitButton>
            </form>
          </GlassCard>

          {/* Family */}
          <GlassCard accent="rose" className="text-left">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Family</h2>
              <Link
                href="/family"
                className="text-sm text-rose-700 dark:text-rose-300 hover:underline"
              >
                Manage
              </Link>
            </div>
            <div className="mt-4">
              {counts.families > 0 ? (
                <div className="text-sm text-slate-700 dark:text-slate-300">
                  {counts.families} member{counts.families > 1 ? "s" : ""}{" "}
                  connected.
                </div>
              ) : (
                <EmptyList
                  title="No family added"
                  hint="Invite relatives to share dates and sync calendars."
                  action={{ label: "Invite family", href: "/family/invite" }}
                />
              )}
            </div>
          </GlassCard>

          {/* Calendars */}
          <GlassCard
            accent="sky"
            className="text-left md:col-span-2 xl:col-span-1"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Calendars</h2>
              <Link
                href="/connections"
                className="text-sm text-sky-700 dark:text-sky-300 hover:underline"
              >
                Connections
              </Link>
            </div>
            <div className="mt-4">
              {counts.accounts > 0 ? (
                <div className="text-sm text-slate-700 dark:text-slate-300">
                  Google Calendar connected.
                </div>
              ) : (
                <EmptyList
                  title="No calendar linked"
                  hint="Connect Google to auto-import birthdays & anniversaries."
                  action={{
                    label: "Connect Google",
                    href: "/calendar/google/connect",
                  }}
                />
              )}
            </div>
          </GlassCard>
        </div>

        {/* quick actions */}
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/events/new"
            className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-white bg-gradient-to-r from-rose-400 via-pink-400 to-violet-400 hover:from-rose-500 hover:via-pink-500 hover:to-violet-500 shadow-md"
          >
            ➕ Add special day
          </Link>
          <Link
            href="/family/invite"
            className="inline-flex items-center gap-2 rounded-xl px-4 py-2 border border-rose-200/70 dark:border-white/10 text-rose-700 hover:bg-rose-50 dark:text-rose-200 dark:hover:bg-white/5"
          >
            ✉️ Invite family
          </Link>
          <Link
            href="/calendar/google/connect"
            className="inline-flex items-center gap-2 rounded-xl px-4 py-2 border border-sky-200/70 dark:border-white/10 text-sky-700 hover:bg-sky-50 dark:text-sky-200 dark:hover:bg-white/5"
          >
            🔗 Sync Google
          </Link>
        </div>
      </section>
    </main>
  );
}

function EmptyList({
  title,
  hint,
  action,
}: {
  title: string;
  hint: string;
  action?: { label: string; href: string };
}) {
  return (
    <div className="rounded-2xl border border-white/50 dark:border-white/10 bg-white/50 dark:bg-slate-900/40 px-6 py-10 text-center">
      <div className="font-medium">{title}</div>
      <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        {hint}
      </div>
      {action && (
        <Link
          href={action.href}
          className="mt-4 inline-flex items-center rounded-xl px-4 py-2 text-white bg-slate-900/80 dark:bg-white/15 hover:opacity-90"
        >
          {action.label}
        </Link>
      )}
    </div>
  );
}
