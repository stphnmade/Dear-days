// src/app/(dashboard)/family/[familyId]/manage/page.tsx
import { prisma } from "@/lib/db";
import ServerForm from "./ServerForm";
import Link from "next/link";
import { getAuthSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { removeFamilyMember } from "../../actions";
import SubmitButton from "@/ui/SubmitButton";

export default async function ManageFamilyPage({
  params,
}: {
  params: Promise<{ familyId: string }>;
}) {
  const session = await getAuthSession();
  if (!session?.user) redirect("/");
  const userId = (session.user as any).id as string;

  const { familyId } = await params;
  const family = await prisma.family.findUnique({
    where: { id: familyId },
    include: {
      owner: { select: { id: true, name: true, email: true } },
      members: {
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!family) throw new Error("Family not found");
  if (family.ownerId !== userId) {
    redirect(`/family?familyId=${family.id}`);
  }

  return (
    <main className="mx-auto max-w-5xl space-y-4 p-6 dd-page">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Manage Family</h1>
        <div className="flex items-center gap-2">
          <Link href="/dashboard" className="rounded-xl px-3 py-2 text-sm dd-btn-neutral">
            Dashboard
          </Link>
          <Link href={`/family?familyId=${family.id}`} className="rounded-xl px-3 py-2 text-sm dd-btn-neutral">
            Back to Group
          </Link>
        </div>
      </div>
      <ServerForm family={family} />

      <section className="rounded-2xl p-5 dd-card">
        <h2 className="text-lg font-semibold">Members & Permissions</h2>
        <p className="mt-1 text-sm dd-text-muted">
          Remove members who should no longer access this group.
        </p>

        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between rounded-xl px-3 py-2 dd-card-muted">
            <div>
              <div className="font-medium">{family.owner.name ?? "Owner"}</div>
              <div className="text-xs dd-text-muted">
                {family.owner.email ?? "No email"}
              </div>
            </div>
            <span className="text-xs font-medium">Owner</span>
          </div>

          {family.members
            .filter((m) => m.joinedUserId !== family.ownerId)
            .map((m) => (
              <div key={m.id} className="flex items-center justify-between rounded-xl px-3 py-2 dd-card-muted">
                <div>
                  <div className="font-medium">{m.user?.name ?? m.name}</div>
                  <div className="text-xs dd-text-muted">
                    {m.user?.email ?? m.email ?? "No email"}
                  </div>
                </div>
                <form action={removeFamilyMember.bind(null, family.id, m.id)}>
                  <SubmitButton theme="danger">Remove</SubmitButton>
                </form>
              </div>
            ))}
        </div>
      </section>
    </main>
  );
}
