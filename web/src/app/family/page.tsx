import Link from "next/link";
import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getOwnedFamilyId } from "@/lib/family";
import { createInvite, removeMember } from "./invite/actions";
import SubmitButton from "@/ui/SubmitButton";
import GlassCard from "@/ui/GlassCard";
import ImportGoogleButton from "@/ui/ImportGoogleButton";
import { redirect } from "next/navigation";

export default async function FamilyPage() {
  const s = await getAuthSession();
  if (!s?.user) return null;
  const userId = (s.user as any).id as string;

  const familyId = await getOwnedFamilyId(userId);
  if (!familyId) {
    return (
      <main className="mx-auto max-w-3xl p-6">
        <h1 className="text-2xl font-semibold">Family</h1>
        <p className="mt-2 text-sm opacity-70">
          No family found. Create one by adding your first special day.
        </p>
      </main>
    );
  }
  const family = await prisma.family.findUnique({ where: { id: familyId } });
  if (!family) {
    return (
      <main className="mx-auto max-w-3xl p-6">
        <h1 className="text-2xl font-semibold">Family</h1>
        <p className="mt-2 text-sm opacity-70">
          No family found. Create one by adding your first special day.
        </p>
      </main>
    );
  }

  const members = await prisma.familyMember.findMany({
    where: { familyId: family.id },
    include: { user: true },
    orderBy: { createdAt: "asc" },
  });

  const invites = await prisma.invitation.findMany({
    where: { familyId: family.id, status: "pending" },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  const eventsCount = await prisma.specialDay.count({
    where: { familyId: family.id },
  });

  const familyIdConst = family.id;

  async function updateFamilyName(formData: FormData) {
    "use server";
    const name = formData.get("name")?.toString();
    if (!name) return;
    await prisma.family.update({
      where: { id: familyIdConst },
      data: { name },
    });
    // After updating, navigate back to the family page so the server
    // component re-renders with the updated name.
    redirect(`/family`);
  }

  return (
    <main className="mx-auto w-[80%] max-w-7xl p-6">
      {/* Hero - full width big snapshot card */}
      <div className="mb-6">
        <GlassCard accent="violet" className="text-left">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-sm text-slate-500">Family Dashboard</div>
              <div className="text-2xl font-semibold">{family.name}</div>
              <div className="mt-2 text-sm text-slate-600">
                Members: {members.length} • Events: {eventsCount}
              </div>
            </div>
            <div className="text-right">
              <Link
                href="/connections"
                className="text-sm text-slate-500 underline"
              >
                Connections
              </Link>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-lg bg-white/20 p-4">
              <div className="text-sm text-slate-500">Upcoming events</div>
              <div className="text-xl font-semibold mt-1">{eventsCount}</div>
            </div>
            <div className="rounded-lg bg-white/20 p-4">
              <div className="text-sm text-slate-500">Members</div>
              <div className="text-xl font-semibold mt-1">{members.length}</div>
            </div>
            <div className="rounded-lg bg-white/20 p-4">
              <div className="text-sm text-slate-500">Pending invites</div>
              <div className="text-xl font-semibold mt-1">{invites.length}</div>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Smaller cards below hero in a responsive grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        <GlassCard accent="amber" className="text-left" size="compact">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-slate-500">Invites</div>
              <div className="text-lg font-semibold">Pending</div>
            </div>
            <div className="text-sm opacity-60">{invites.length}</div>
          </div>

          <div className="mt-4 space-y-2 max-h-36 overflow-y-auto">
            {invites.length ? (
              invites.map((inv) => (
                <div
                  key={inv.id}
                  className="flex items-center justify-between gap-3"
                >
                  <div className="text-sm truncate max-w-[14rem]">
                    /invite/{inv.token}
                  </div>
                  <div className="text-xs opacity-60">
                    {new Date(inv.expiresAt).toISOString().slice(0, 10)}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-sm text-slate-600">No pending invites</div>
            )}
          </div>
        </GlassCard>

        <GlassCard accent="rose" className="text-left" size="compact">
          <div>
            <div className="text-sm text-slate-500">Members</div>
            <div className="text-lg font-semibold">{members.length}</div>
          </div>
          <div className="mt-4 space-y-2">
            {members.slice(0, 6).map((m) => (
              <div key={m.id} className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-rose-300 to-violet-300 flex items-center justify-center text-white text-sm">
                  {((m.user?.name ?? m.name ?? "?").split(" ")[0] || "?")[0]}
                </div>
                <div className="text-sm truncate">
                  {m.user?.name ?? m.name ?? "(pending)"}
                </div>
              </div>
            ))}
          </div>
        </GlassCard>

        <GlassCard accent="sky" className="text-left" size="compact">
          <div>
            <div className="text-sm text-slate-500">Invite</div>
            <div className="text-lg font-semibold">Invite family</div>
          </div>
          <div className="mt-4">
            <Link
              href="/family/invite"
              className="inline-flex items-center gap-2 rounded-xl px-4 py-2 bg-rose-400 text-white"
            >
              Invite family
            </Link>
          </div>
        </GlassCard>

        <GlassCard accent="slate" className="text-left" size="compact">
          <div>
            <div className="text-sm text-slate-500">Customize</div>
            <div className="text-lg font-semibold">Family profile</div>
          </div>
          <form action={updateFamilyName} className="mt-4 space-y-2">
            <input
              name="name"
              defaultValue={family.name}
              className="w-full rounded-xl border px-3 py-2"
            />
            <div className="flex gap-2">
              <SubmitButton>Save</SubmitButton>
              <Link href="#" className="rounded-xl border px-4 py-2">
                Upload photo
              </Link>
            </div>
          </form>
        </GlassCard>
      </div>
    </main>
  );
}
