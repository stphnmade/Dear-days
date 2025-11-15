import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth";
import GlassCard from "@/ui/GlassCard";
import SubmitButton from "@/ui/SubmitButton";
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
    <main className="mx-auto w-[80%] max-w-4xl p-6">
      <GlassCard accent="amber" className="text-left">
        <div>
          <div className="text-sm text-slate-500">Invite family</div>
          <div className="text-lg font-semibold mt-1">Create a new invite link</div>
        </div>

        <p className="mt-4 text-sm text-slate-600">
          Generate a one-time invite link to share with a family member. The
          link will appear on your family page under Pending Invites.
        </p>

        <div className="mt-6">
          <form action={handleCreate}>
            <SubmitButton>Create invite</SubmitButton>
            <Link href="/family" className="ml-3 text-sm text-slate-500 underline">
              Back to family
            </Link>
          </form>
        </div>
      </GlassCard>
    </main>
  );
}
