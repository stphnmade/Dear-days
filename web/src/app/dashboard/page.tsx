// src/app/dashboard/page.tsx
import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

import { getAuthSession } from "@/lib/auth";
import { getUpcomingEvents, getCounts } from "@/lib/queries";
import { getUserGroups } from "@/lib/family";

import GlassCard from "@/ui/GlassCard";
import ProfileMenu from "@/ui/ProfileMenu";
import OccasionIconsBg from "@/ui/OccasionIconsBg";
import EventCreateModal from "@/ui/EventCreateModal";
import InviteFamilyModal from "@/ui/InviteFamilyModal";

import FamilyCalendar from "@/ui/FamilyCalendar"; // NEW: client calendar component

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
  let groups: Awaited<ReturnType<typeof getUserGroups>> = [];

  try {
    if (userId) {
      [upcoming, counts, groups] = await Promise.all([
        getUpcomingEvents(userId, 6),
        getCounts(userId),
        getUserGroups(userId),
      ]);
    }
  } catch (e) {
    console.error("dashboard data error", e);
  }

  return (
    <main className="relative min-h-screen dd-page">
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
            <div className="h-10 w-10 rounded-full dd-card-muted" />
          )}
          <div>
            <div className="text-sm dd-text-muted">
              Welcome back
            </div>
            <div className="text-lg font-semibold">{name}</div>
          </div>
        </div>
        <ProfileMenu avatar={avatar} name={name} />
      </div>

      <section className="relative z-0 mx-auto max-w-6xl px-6 pb-20">
        {/* next celebrations chips */}
        <div className="mt-8 flex flex-wrap gap-2">
          {upcoming.length > 0 ? (
            upcoming.slice(0, 3).map((ev) => {
              const vis = (ev as any).visibility ?? "private";
              const visIcon =
                vis === "family" ? "👪" : vis === "public" ? "🌐" : "🔒";
              return (
                <span
                  key={ev.id}
                  className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm
                             dd-card shadow-sm"
                >
                  <span aria-hidden>🎉</span>
                  <span className="font-medium">
                    {ev.title ?? ev.person ?? "Special Day"}
                  </span>
                  <span className="dd-text-muted">
                    {fmtDate(ev.date)}
                  </span>
                  <span className="dd-text-muted">
                    {visIcon}
                  </span>
                </span>
              );
            })
          ) : (
            <span className="text-sm dd-text-muted">
              No celebrations yet — let’s add your first one below.
            </span>
          )}
        </div>

        {/* grid */}
        <div className="mt-8 grid gap-6 grid-cols-1 md:grid-cols-3 xl:grid-cols-3">
          {/* Upcoming */}
          <GlassCard accent="violet" className="text-left">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Upcoming</h2>
              <Link
                href="/events"
                className="text-sm dd-link"
              >
                View all
              </Link>
            </div>

            <div className="mt-4 space-y-3">
              {upcoming.length ? (
                upcoming.map((ev) => {
                  const vis = (ev as any).visibility ?? "private";
                  const visIcon =
                    vis === "family" ? "👪" : vis === "public" ? "🌐" : "🔒";
                  return (
                <div
                      key={ev.id}
                      className="flex items-center justify-between rounded-xl px-4 py-3 dd-card-muted"
                    >
                      <div className="min-w-0">
                        <div className="truncate font-medium">
                          {ev.title ?? ev.person ?? "Special Day"}
                        </div>
                        <div className="text-xs dd-text-muted">
                          {fmtDate(ev.date)}
                        </div>
                      </div>
                      <div className="ml-3 text-sm dd-text-muted">
                        {visIcon}
                      </div>
                    </div>
                  );
                })
              ) : (
                <EmptyList
                  title="No upcoming events"
                  hint="Add birthdays, anniversaries, or import from Google Calendar."
                  action={{ label: "Add special day", href: "/events" }}
                />
              )}
            </div>
          </GlassCard>

          {/* Groups */}
          <GlassCard accent="rose" className="text-left">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Groups</h2>
              <Link
                href="/family"
                className="text-sm dd-link"
              >
                Manage
              </Link>
            </div>
            <div className="mt-4">
              {counts.families > 0 ? (
                <div className="space-y-2">
                  <div className="text-sm dd-text-muted">
                    You are in {counts.families} group{counts.families > 1 ? "s" : ""}.
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {groups.slice(0, 4).map((g) => (
                      <Link
                        key={g.id}
                        href={`/family?familyId=${encodeURIComponent(g.id)}`}
                        className="rounded-full px-3 py-1 text-xs dd-card-muted"
                      >
                        {g.name}
                      </Link>
                    ))}
                  </div>
                </div>
              ) : (
                <EmptyList
                  title="No groups yet"
                  hint="Join a group invite or create one from your first event."
                  action={{ label: "Open groups", href: "/family" }}
                />
              )}
            </div>
          </GlassCard>

          {/* Calendar (replaces old Notifications card) */}
          <GlassCard accent="amber" className="text-left">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Shared Family Calendar</h2>
              <Link
                href="/family/calendar"
                className="text-sm dd-link"
              >
                Open calendar
              </Link>
            </div>

            <div className="mt-4">
              {/* FamilyCalendar is a client component that provides month/list views */}
              <FamilyCalendar events={upcoming} />
            </div>
          </GlassCard>
        </div>

        {/* quick actions */}
        <div className="mt-8 flex flex-wrap gap-3">
          <EventCreateModal
            buttonLabel="Add special day"
            buttonClassName="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm dd-btn-primary hover:opacity-90"
            groups={groups.map((g) => ({
              id: g.id,
              name: g.name,
              canPost: g.role === "owner" || g.allowMemberPosting,
            }))}
            defaultFamilyId={groups[0]?.id}
            defaultScope={groups.length ? "family" : "personal"}
          />
          <InviteFamilyModal
            buttonLabel="Invite people"
            buttonClassName="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm dd-btn-success hover:opacity-90"
            groups={groups.map((g) => ({ id: g.id, name: g.name }))}
            defaultFamilyId={groups[0]?.id}
          />
          <Link
            href="/calendar/google/connect"
            className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm dd-btn-neutral"
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
    <div className="rounded-2xl px-6 py-10 text-center dd-card">
      <div className="font-medium">{title}</div>
      <div className="mt-1 text-sm dd-text-muted">
        {hint}
      </div>
      {action && (
        <Link
          href={action.href}
          className="mt-4 inline-flex items-center rounded-xl px-4 py-2 text-sm dd-btn-primary hover:opacity-90"
        >
          {action.label}
        </Link>
      )}
    </div>
  );
}
