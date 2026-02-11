import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { createIcalFeedToken } from "@/lib/ical";
import { getUserGroups } from "@/lib/family";
import CopyTextButton from "@/ui/CopyTextButton";
import ImportGoogleButton from "@/ui/ImportGoogleButton";
import ImportIcalPanel from "@/ui/ImportIcalPanel";

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
          <h1 className="text-2xl font-semibold">Connections</h1>
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
  const google = await db.account.findFirst({
    where: { userId, provider: "google" },
  });

  const feedToken = createIcalFeedToken(activeGroup.id);
  const appOrigin = await getAppOrigin();
  const feedPath = `/api/calendar/ics?familyId=${encodeURIComponent(activeGroup.id)}&token=${encodeURIComponent(feedToken ?? "")}`;
  const feedUrl = appOrigin ? `${appOrigin}${feedPath}` : "";
  const appleFeedUrl = feedUrl
    ? feedUrl.replace(/^https?:\/\//, "webcal://")
    : "";
  const googleSubscribeUrl = feedUrl
    ? `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(feedUrl)}`
    : "";

  return (
    <main className="mx-auto w-[92%] max-w-6xl py-8 dd-page">
      <section className="rounded-3xl p-7 dd-card-muted">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] dd-text-muted">
              Calendar Connections
            </p>
            <h1 className="mt-2 text-3xl font-semibold">
              Keep {activeGroup.name} in sync
            </h1>
            <p className="mt-3 max-w-3xl text-sm dd-text-muted">
              Connect Google for two-way sync, import iCal files from anywhere,
              and publish a private feed for Apple and Google Calendar subscriptions.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
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
                  g.id === activeGroup.id ? "dd-card" : "dd-card-muted"
                }`}
              >
                {g.name}
              </Link>
            ))}
          </div>
        ) : null}
      </section>

      <section className="mt-6 grid gap-5 lg:grid-cols-3">
        <article className="rounded-3xl p-5 dd-card">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Google Calendar</h2>
              <p className="mt-1 text-sm dd-text-muted">
                Import birthdays and recurring dates from your connected account.
              </p>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                google ? "dd-btn-success" : "dd-btn-danger"
              }`}
            >
              {google ? "Connected" : "Not connected"}
            </span>
          </div>

          <div className="mt-5">
            {google ? (
              <ImportGoogleButton familyId={activeGroup.id} />
            ) : (
              <a
                href="/api/auth/signin/google?callbackUrl=%2Fconnections"
                className="inline-flex rounded-xl px-4 py-2 text-sm dd-btn-primary"
              >
                Connect Google
              </a>
            )}
          </div>
        </article>

        <article className="rounded-3xl p-5 dd-card">
          <h2 className="text-lg font-semibold">Import iCal</h2>
          <p className="mt-1 text-sm dd-text-muted">
            Bring events from `.ics` files or public iCal URLs.
          </p>
          <div className="mt-4">
            <ImportIcalPanel embedded familyId={activeGroup.id} />
          </div>
        </article>

        <article className="rounded-3xl p-5 dd-card">
          <h2 className="text-lg font-semibold">Apple + Google Subscribe</h2>
          <p className="mt-1 text-sm dd-text-muted">
            Share this private feed to keep group dates visible in external
            calendar apps.
          </p>

          {feedToken && feedUrl ? (
            <div className="mt-4 space-y-3">
              <div className="rounded-xl p-3 text-xs dd-card-muted">
                <div className="mb-1 font-medium">Private iCal feed URL</div>
                <div className="break-all">{feedUrl}</div>
              </div>

              <div className="flex flex-wrap gap-2">
                <CopyTextButton text={feedUrl} label="Copy iCal URL" />
                <a href={appleFeedUrl} className="rounded-lg px-3 py-2 text-sm dd-btn-success">
                  Open in Apple Calendar
                </a>
                <a
                  href={googleSubscribeUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg px-3 py-2 text-sm dd-btn-primary"
                >
                  Open in Google Calendar
                </a>
              </div>

              <p className="text-xs dd-text-muted">
                This feed is token-protected. If the link leaks, rotate your
                `CALENDAR_FEED_SECRET`.
              </p>
            </div>
          ) : (
            <div className="mt-4 rounded-xl p-3 text-sm dd-card-muted">
              Set `CALENDAR_FEED_SECRET` (or `NEXTAUTH_SECRET`) to enable
              private iCal feed subscriptions.
            </div>
          )}

          <div className="mt-4">
            <Link href="/events" className="text-sm font-medium underline underline-offset-4">
              View imported events
            </Link>
          </div>
        </article>
      </section>
    </main>
  );
}
