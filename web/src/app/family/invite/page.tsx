import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth";
import { createInvite } from "./actions";

export default async function InvitePage() {
  const s = await getAuthSession();
  if (!s?.user) {
    // not signed in
    redirect("/");
  }

  async function handleCreate() {
    "use server";
    await createInvite();
    // after creating the invite, go back to the family page where invites are shown
    redirect("/family");
  }

  return (
    <main className="mx-auto w-[92%] max-w-3xl py-10 dd-page">
      <section className="rounded-2xl p-6 dd-card">
        <p className="text-xs uppercase tracking-[0.18em] dd-text-muted">Family Invite</p>
        <h1 className="mt-2 text-3xl font-semibold">Create an invite link</h1>
        <p className="mt-3 text-sm dd-text-muted">
          Invite now also lives as a modal on Dashboard and Family. This page remains as a fallback entry point.
        </p>

        <form action={handleCreate} className="mt-6 flex flex-wrap gap-3">
          <button type="submit" className="inline-flex items-center rounded-xl px-4 py-2 text-sm dd-btn-success">
            Create Invite
          </button>
          <Link href="/family" className="inline-flex items-center rounded-xl px-4 py-2 text-sm dd-btn-neutral">
            Back to Family
          </Link>
        </form>
      </section>
    </main>
  );
}
