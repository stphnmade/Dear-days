import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth";
import SignOutButton from "@/ui/SignOutButton";

export default async function SettingsPage() {
  const session = await getAuthSession();
  if (!session?.user) redirect("/");

  return (
    <main className="mx-auto max-w-3xl p-6 dd-page">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Settings</h1>
        <Link
          href="/dashboard"
          className="rounded-xl px-3 py-2 text-sm dd-btn-neutral"
        >
          Back to dashboard
        </Link>
      </div>

      <div className="mt-6 rounded-2xl p-5 dd-card">
        <div className="text-sm dd-text-muted">Account</div>
        <div className="mt-2 text-base">{session.user.name ?? "Unnamed user"}</div>
        <div className="text-sm dd-text-muted">{session.user.email ?? "No email"}</div>
      </div>

      <div className="mt-4 rounded-2xl p-5 dd-card">
        <div className="text-sm dd-text-muted">Integrations</div>
        <div className="mt-3">
          <Link href="/connections" className="inline-flex rounded-xl px-4 py-2 text-sm dd-btn-primary hover:opacity-90">
            Manage calendar connections
          </Link>
        </div>
      </div>

      <div className="mt-4 rounded-2xl p-5 dd-card">
        <div className="text-sm dd-text-muted">Session</div>
        <div className="mt-3">
          <SignOutButton className="rounded-xl px-4 py-2 text-sm dd-btn-danger hover:opacity-90" />
        </div>
      </div>
    </main>
  );
}
