import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { createIcalFeedToken } from "@/lib/ical";
import { getUserGroups } from "@/lib/family";
import { mapSyncSettings } from "@/lib/connections";

import CopyTextButton from "@/ui/CopyTextButton";
import ImportGoogleButton from "@/ui/ImportGoogleButton";
import ImportIcalPanel from "@/ui/ImportIcalPanel";
import SyncPauseToggle from "@/ui/connections/SyncPauseToggle";
import ConnectionPreferencesForm from "@/ui/connections/ConnectionPreferencesForm";

async function getAppOrigin() {
  const h = await headers();
  const envOrigin = process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXTAUTH_URL;
  if (envOrigin) return envOrigin.replace(/\/+$/, "");

  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (!host) return "";
  const proto = h.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}

type SearchParams = Promise<{ familyId?: string }>;

export default async function ConnectionsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/");

  const userId = session.user.id;
  const { familyId: requestedFamilyId } = await searchParams;
  const groups = await getUserGroups(userId);

  if (!groups.length) {
    return (
      <main className="mx-auto w-[92%] max-w-4xl py-8 dd-page">
        <section className="rounded-2xl p-6 dd-card">
          <h1 className="text-2xl font-semibold">Global Sync Dashboard</h1>
          <p className="mt-2 text-sm dd-text-muted">
            Join a group first to configure shared calendar connections.
          </p>
          <div className="mt-4 flex gap-2">
            <Link href="/dashboard" className="rounded-xl px-4 py-2 text-sm dd-btn-neutral">
              Dashboard
            </Link>
            <Link href="/family" className="rounded-xl px-4 py-2 text-sm dd-btn-primary">
              Open groups
            </Link>
          </div>
        </section>
      </main>
    );
  }

  const activeGroup = groups.find((g) => g.id === requestedFamilyId) ?? groups[0];

  const [google, userSettingsRaw] = await Promise.all([
    db.account.findFirst({
      where: { userId, provider: "google" },
      select: {
        id: true,
        providerAccountId: true,
      },
    }),
    db.user.findUnique({
      where: { id: userId },
      select: {
        syncPaused: true,
        conflictHandling: true,
        defaultEventDestination: true,
        syncBirthdays: true,
        syncGroupMeetings: true,
        syncReminders: true,
        googlePullEnabled: true,
        googlePushEnabled: true,
        googleCalendarScopes: true,
        lastGlobalRefreshAt: true,
      },
    }),
  ]);

  if (!userSettingsRaw) redirect("/");

  const settings = mapSyncSettings(userSettingsRaw);

  const feedToken = createIcalFeedToken(activeGroup.id);
  const appOrigin = await getAppOrigin();
  const feedPath = `/api/calendar/ics?familyId=${encodeURIComponent(activeGroup.id)}&token=${encodeURIComponent(feedToken ?? "")}`;
  const feedUrl = appOrigin ? `${appOrigin}${feedPath}` : "";
  const appleFeedUrl = feedUrl ? feedUrl.replace(/^https?:\/\//, "webcal://") : "";
  const googleSubscribeUrl = feedUrl
    ? `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(feedUrl)}`
    : "";

  const platforms = [
    { name: "Google", active: Boolean(google) },
    { name: "Apple", active: Boolean(feedToken && feedUrl) },
    { name: "Outlook", active: Boolean(feedToken && feedUrl) },
  ];
  const healthyCount = platforms.filter((p) => p.active).length;
  const healthyText =
    healthyCount === 3
      ? "All 3 calendars are active."
      : `${healthyCount} of 3 calendar connections are active.`;

  const lastRefresh = settings.lastGlobalRefreshAt
    ? new Date(settings.lastGlobalRefreshAt).toLocaleString()
    : "Not synced yet";

  return (
    <main className="mx-auto w-[94%] max-w-7xl py-8 dd-page">
      <section className="rounded-3xl border border-[#2C2C2E] bg-[#1C1C1E] p-6 text-white">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-[#8E8E93]">Global Sync Dashboard</p>
            <h1 className="mt-2 text-3xl font-semibold">Calendar Connections</h1>
            <div className="mt-3 flex items-center gap-2 text-sm text-[#8E8E93]">
              <span className="inline-block h-2.5 w-2.5 animate-pulse rounded-full bg-[#22C55E]" />
              <span>{healthyText}</span>
              <span>·</span>
              <span>Last global refresh: {lastRefresh}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <SyncPauseToggle initialPaused={settings.syncPaused} />
            <Link href="/dashboard" className="rounded-xl px-3 py-2 text-sm dd-btn-neutral">
              Dashboard
            </Link>
            <Link
              href={`/family?familyId=${encodeURIComponent(activeGroup.id)}`}
              className="rounded-xl px-3 py-2 text-sm dd-btn-neutral"
            >
              Back to Group
            </Link>
          </div>
        </div>

        {groups.length > 1 ? (
          <div className="mt-5 flex flex-wrap gap-2">
            {groups.map((g) => (
              <Link
                key={g.id}
                href={`/connections?familyId=${encodeURIComponent(g.id)}`}
                className={`rounded-full px-3 py-1 text-xs ${
                  g.id === activeGroup.id ? "dd-btn-primary" : "dd-btn-neutral"
                }`}
              >
                {g.name}
              </Link>
            ))}
          </div>
        ) : null}
      </section>

      <section className="mt-6 grid gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="rounded-2xl border border-[var(--dd-border)] p-4 dd-card">
          <div className="text-xs uppercase tracking-[0.16em] dd-text-muted">Navigation</div>
          <nav className="mt-3 space-y-2 text-sm">
            <a href="#connected-accounts" className="block rounded-lg px-3 py-2 dd-card-muted">
              Connected Accounts
            </a>
            <a href="#privacy-permissions" className="block rounded-lg px-3 py-2 dd-card-muted">
              Privacy & Permissions
            </a>
            <a href="#export-data" className="block rounded-lg px-3 py-2 dd-card-muted">
              Export Data
            </a>
            <a href="#notification-triggers" className="block rounded-lg px-3 py-2 dd-card-muted">
              Notification Triggers
            </a>
          </nav>
        </aside>

        <div className="space-y-5">
          <section className="grid gap-3 sm:grid-cols-3">
            {platforms.map((platform) => (
              <article
                key={platform.name}
                className={`rounded-2xl border-2 p-4 ${
                  platform.active ? "border-[#3454D1]" : "border-[#2C2C2E]"
                } dd-card`}
              >
                <div className="text-sm font-semibold">{platform.name}</div>
                {platform.active ? (
                  <div className="mt-1 text-xs dd-text-muted">Active</div>
                ) : null}
              </article>
            ))}
          </section>

          <section id="connected-accounts" className="grid gap-5 xl:grid-cols-2">
            <article
              className={`rounded-2xl border-2 p-5 ${
                google ? "border-[#3454D1]" : "border-[#2C2C2E]"
              } dd-card`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">Google Calendar</h2>
                  <p className="mt-1 text-sm dd-text-muted">
                    Read from selected Google calendars and optionally push Dear Days events.
                  </p>
                </div>
                {google ? (
                  <span className="rounded-full px-3 py-1 text-xs font-medium dd-btn-success">
                    Active
                  </span>
                ) : null}
              </div>

              <div className="mt-4 rounded-xl p-3 text-sm dd-card-muted">
                <div>Linked identity: {session.user.email ?? "Unknown"}</div>
                <div className="mt-1 text-xs dd-text-muted">Last synced: {lastRefresh}</div>
              </div>

              <div className="mt-4">
                <ImportGoogleButton
                  familyId={activeGroup.id}
                  connected={Boolean(google)}
                  initialSettings={settings}
                />
              </div>
            </article>

            <article
              className={`rounded-2xl border-2 p-5 ${
                feedToken && feedUrl ? "border-[#3454D1]" : "border-[#2C2C2E]"
              } dd-card`}
            >
              <h2 className="text-lg font-semibold">iCal / URL Feed</h2>
              <p className="mt-1 text-sm dd-text-muted">
                Pull from subscription URLs and push your private Dear Days feed to Apple or Outlook.
              </p>

              <div className="mt-4">
                <ImportIcalPanel embedded familyId={activeGroup.id} />
              </div>

              <div className="mt-4 rounded-xl p-3 text-xs dd-card-muted">
                <div className="font-medium">Copy Secret URL</div>
                {feedToken && feedUrl ? (
                  <>
                    <div className="mt-1 break-all">{feedUrl}</div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <CopyTextButton text={feedUrl} label="Copy Secret URL" />
                      <a href={appleFeedUrl} className="rounded-lg px-3 py-2 text-sm dd-btn-neutral">
                        Apple Calendar
                      </a>
                      <a
                        href={googleSubscribeUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-lg px-3 py-2 text-sm dd-btn-neutral"
                      >
                        Outlook / Google Subscribe
                      </a>
                    </div>
                  </>
                ) : (
                  <div className="mt-1 text-sm dd-text-muted">
                    Set `CALENDAR_FEED_SECRET` (or `NEXTAUTH_SECRET`) to publish the private feed.
                  </div>
                )}
              </div>
            </article>
          </section>

          <section id="privacy-permissions" className="rounded-2xl p-5 dd-card">
            <h2 className="text-lg font-semibold">Privacy & Permissions</h2>
            <p className="mt-1 text-sm dd-text-muted">
              Configure sync conflict behavior and default event destination.
            </p>
            <div className="mt-4">
              <ConnectionPreferencesForm
                initialConflictHandling={settings.conflictHandling}
                initialDefaultDestination={settings.defaultEventDestination}
              />
            </div>
          </section>

          <section id="export-data" className="rounded-2xl p-5 dd-card">
            <h2 className="text-lg font-semibold">Export Data</h2>
            <p className="mt-1 text-sm dd-text-muted">
              Use the private iCal feed above to mirror Dear Days into native calendar apps without creating additional accounts.
            </p>
          </section>

          <section id="notification-triggers" className="rounded-2xl p-5 dd-card">
            <h2 className="text-lg font-semibold">Notification Triggers</h2>
            <p className="mt-1 text-sm dd-text-muted">
              Notification triggers are currently calendar-driven. As integrations expand, trigger rules will appear here.
            </p>
          </section>

          {!google && !feedToken ? (
            <section className="rounded-2xl border border-dashed border-[var(--dd-border)] p-6 text-center dd-card-muted">
              <div className="mx-auto mb-2 text-3xl opacity-50">◌</div>
              <h3 className="text-lg font-semibold">Connect your first calendar to see the magic</h3>
              <p className="mt-1 text-sm dd-text-muted">
                Start with Google Calendar or publish your first Dear Days feed link.
              </p>
            </section>
          ) : null}
        </div>
      </section>
    </main>
  );
}
