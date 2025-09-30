import Link from "next/link";
import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getOwnedFamilyId } from "@/lib/family";
import { createInvite, removeMember } from "./invite/actions";
import SubmitButton from "@/ui/SubmitButton";

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

  return (
    <main className="mx-auto max-w-3xl p-6 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Family: {family.name}</h1>
        <Link href="/connections" className="underline text-sm">
          Connections
        </Link>
      </div>

      {/* Members */}
      <section>
        <h2 className="text-lg font-semibold">Members</h2>
        <ul className="mt-3 space-y-2">
          {members.map((m) => (
            <li
              key={m.id}
              className="flex items-center justify-between rounded-xl border px-4 py-3"
            >
              <div>
                <div className="font-medium">
                  {m.user?.name ?? m.name ?? "(pending)"}{" "}
                  <span className="text-xs opacity-60">
                    {m.user?.email ?? m.email ?? ""}
                  </span>
                </div>
                {m.relation && (
                  <div className="text-xs opacity-70">{m.relation}</div>
                )}
              </div>
              <form action={async () => removeMember(m.id)}>
                <SubmitButton theme="danger">Remove</SubmitButton>
              </form>
            </li>
          ))}
        </ul>
      </section>

      {/* Invites */}
      <section>
        <h2 className="text-lg font-semibold">Invites</h2>
        <form action={createInvite}>
          <SubmitButton>Create invite link</SubmitButton>
        </form>
        <ul className="mt-3 space-y-2 text-sm">
          {invites.map((inv) => (
            <li
              key={inv.id}
              className="flex items-center justify-between rounded-xl border px-4 py-2"
            >
              <span>/invite/{inv.token}</span>
              <span className="opacity-60">
                expires {new Date(inv.expiresAt).toISOString().slice(0, 10)}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
