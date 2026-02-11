import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getUserGroups } from "@/lib/family";
import { leaveFamily } from "./actions";
import SubmitButton from "@/ui/SubmitButton";
import GlassCard from "@/ui/GlassCard";
import InviteFamilyModal from "@/ui/InviteFamilyModal";
import EventCreateModal from "@/ui/EventCreateModal";

type SearchParams = Promise<{ familyId?: string }>;

export default async function FamilyPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await getAuthSession();
  if (!session?.user) redirect("/");
  const userId = (session.user as any).id as string;
  const { familyId: requestedFamilyId } = await searchParams;

  const groups = await getUserGroups(userId);
  if (!groups.length) {
    return (
      <main className="mx-auto w-[92%] max-w-4xl p-6 dd-page">
        <div className="rounded-2xl p-6 dd-card">
          <h1 className="text-2xl font-semibold">Groups</h1>
          <p className="mt-2 text-sm dd-text-muted">
            You are not a member of any groups yet. Create your first event or accept an invite to get started.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/dashboard" className="rounded-xl px-4 py-2 text-sm dd-btn-neutral">
              Back to Dashboard
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const activeGroup =
    groups.find((g) => g.id === requestedFamilyId) ?? groups[0];

  const family = await prisma.family.findUnique({
    where: { id: activeGroup.id },
    include: {
      owner: { select: { id: true, name: true, email: true } },
      members: {
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!family) redirect("/dashboard");

  const isOwner = family.ownerId === userId;
  const invites = isOwner
    ? await prisma.invitation.findMany({
        where: { familyId: family.id, status: "pending" },
        orderBy: { createdAt: "desc" },
        take: 5,
      })
    : [];
  const eventsCount = await prisma.specialDay.count({
    where: { familyId: family.id },
  });

  const groupOptions = groups.map((g) => ({
    id: g.id,
    name: g.name,
    canPost: g.role === "owner" || g.allowMemberPosting,
  }));
  const inviteGroups = groups.map((g) => ({ id: g.id, name: g.name }));
  const ownerIsListed = family.members.some((m) => m.joinedUserId === family.ownerId);
  const displayMembers = ownerIsListed
    ? family.members
    : [
        {
          id: `owner-${family.ownerId}`,
          joinedUserId: family.ownerId,
          name: family.owner.name ?? "Owner",
          email: family.owner.email ?? null,
          user: family.owner,
        },
        ...family.members,
      ];

  return (
    <main className="mx-auto w-[92%] max-w-7xl p-6 dd-page">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">Groups</h1>
        <div className="flex flex-wrap gap-2">
          <Link href="/dashboard" className="rounded-xl px-3 py-2 text-sm dd-btn-neutral">
            Dashboard
          </Link>
          <Link
            href={`/connections?familyId=${encodeURIComponent(family.id)}`}
            className="rounded-xl px-3 py-2 text-sm dd-btn-neutral"
          >
            Connections
          </Link>
        </div>
      </div>

      <div className="mb-6">
        <GlassCard accent="violet" className="text-left">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm dd-text-muted">
                Active group · {isOwner ? "Owner" : "Member"}
              </div>
              <div className="text-2xl font-semibold">{family.name}</div>
              <div className="mt-2 text-sm dd-text-muted">
                Members: {displayMembers.length} • Events: {eventsCount}
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <InviteFamilyModal
              buttonLabel="Invite people"
              groups={inviteGroups}
              defaultFamilyId={family.id}
            />
            <EventCreateModal
              buttonLabel="Add date"
              buttonClassName="rounded-xl px-4 py-2 text-sm dd-btn-primary hover:opacity-90"
              groups={groupOptions}
              defaultFamilyId={family.id}
              defaultScope="family"
            />
            {isOwner ? (
              <Link
                href={`/family/${family.id}/manage`}
                className="rounded-xl px-4 py-2 text-sm dd-btn-neutral"
              >
                Advanced settings
              </Link>
            ) : (
              <form action={leaveFamily.bind(null, family.id)}>
                <SubmitButton theme="danger">Leave group</SubmitButton>
              </form>
            )}
          </div>
        </GlassCard>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <GlassCard accent="amber" className="text-left" size="compact">
          <div className="text-sm dd-text-muted">Your groups</div>
          <div className="mt-3 space-y-2">
            {groups.map((g) => (
              <Link
                key={g.id}
                href={`/family?familyId=${encodeURIComponent(g.id)}`}
                className={`flex items-center justify-between rounded-lg px-3 py-2 ${
                  g.id === family.id ? "dd-card" : "dd-card-muted"
                }`}
              >
                <span className="truncate">{g.name}</span>
                <span className="text-xs dd-text-muted">
                  {g.role === "owner" ? "Owner" : "Member"}
                </span>
              </Link>
            ))}
          </div>
        </GlassCard>

        <GlassCard accent="rose" className="text-left" size="compact">
          <div className="text-sm dd-text-muted">Members</div>
          <div className="mt-3 space-y-2">
            {displayMembers.map((m) => {
              const isFamilyOwner = m.joinedUserId === family.ownerId;
              return (
                <div key={m.id} className="flex items-center justify-between rounded-lg px-3 py-2 dd-card-muted">
                  <div className="min-w-0">
                    <div className="truncate font-medium">{m.user?.name ?? m.name}</div>
                    <div className="truncate text-xs dd-text-muted">
                      {m.user?.email ?? m.email ?? "No email"}
                    </div>
                  </div>
                  <span className="ml-2 text-xs">{isFamilyOwner ? "Owner" : "Member"}</span>
                </div>
              );
            })}
          </div>
        </GlassCard>

        <GlassCard accent="sky" className="text-left" size="compact">
          <div className="text-sm dd-text-muted">Invites</div>
          <div className="mt-3 space-y-2">
            {isOwner ? (
              invites.length ? (
                invites.map((inv) => (
                  <div key={inv.id} className="rounded-lg px-3 py-2 dd-card-muted">
                    <div className="truncate text-sm">/invite/{inv.token}</div>
                    <div className="text-xs dd-text-muted">
                      Expires {new Date(inv.expiresAt).toISOString().slice(0, 10)}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-sm dd-text-muted">No pending invites.</div>
              )
            ) : (
              <div className="text-sm dd-text-muted">
                Invite links are managed by group owners.
              </div>
            )}
          </div>
        </GlassCard>
      </div>
    </main>
  );
}
