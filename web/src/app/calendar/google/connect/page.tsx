import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function GoogleConnectPage() {
  const session = await getAuthSession();
  if (!session?.user?.id) redirect("/auth/login");

  const account = await db.account.findFirst({
    where: { userId: session.user.id, provider: "google" },
    select: { id: true },
  });

  const callback = encodeURIComponent("/connections");

  return (
    <main className="mx-auto w-[92%] max-w-4xl py-8 dd-page">
      <section className="rounded-3xl p-7 dd-card-muted">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] dd-text-muted">
            Connection Setup
          </p>
          <h1 className="mt-2 text-3xl font-semibold">
            Google Calendar
          </h1>
          <p className="mt-3 text-sm dd-text-muted">
            Connect your Google account to import birthdays, anniversaries, and
            recurring dates into Dear Days.
          </p>
        </div>
      </section>

      <section className="mt-6 rounded-3xl p-6 dd-card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm dd-text-muted">Status</p>
            <p className="mt-1 text-lg font-semibold">
              {account ? "Connected" : "Not connected"}
            </p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              account ? "dd-btn-success" : "dd-btn-danger"
            }`}
          >
            {account ? "Ready to sync" : "Needs OAuth"}
          </span>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {account ? (
            <Link
              href="/connections"
              className="rounded-xl px-4 py-2 text-sm dd-btn-primary hover:opacity-90"
            >
              Open Connections
            </Link>
          ) : (
            <a
              href={`/api/auth/signin/google?callbackUrl=${callback}`}
              className="rounded-xl px-4 py-2 text-sm dd-btn-primary hover:opacity-90"
            >
              Connect Google
            </a>
          )}
          <Link
            href="/dashboard"
            className="rounded-xl px-4 py-2 text-sm dd-btn-neutral hover:opacity-90"
          >
            Back to Dashboard
          </Link>
        </div>
      </section>
    </main>
  );
}
