import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function AcceptInvitePage({
  params,
}: {
  params: { token: string };
}) {
  const s = await getAuthSession();
  if (!s?.user) redirect("/");
  const userId = (s.user as any).id as string;

  const invite = await prisma.invitation.findUnique({
    where: { token: params.token },
    select: {
      id: true,
      status: true,
      expiresAt: true,
      familyId: true,
    },
  });

  if (!invite || invite.status !== "pending" || invite.expiresAt < new Date()) {
    return (
      <main className="mx-auto max-w-2xl p-6">
        <h1 className="text-2xl font-semibold">Invite</h1>
        <p className="mt-2">This invite is invalid or expired.</p>
      </main>
    );
  }

  // ✅ Ensure the target family exists (prevents FK violation)
  const family = await prisma.family.findUnique({
    where: { id: invite.familyId },
    select: { id: true },
  });
  if (!family) {
    // stale/bad invite; mark it as invalid to avoid re-use
    await prisma.invitation.update({
      where: { id: invite.id },
      data: { status: "invalid" },
    });
    return (
      <main className="mx-auto max-w-2xl p-6">
        <h1 className="text-2xl font-semibold">Invite</h1>
        <p className="mt-2">This invite points to a deleted family.</p>
      </main>
    );
  }

  // Prefer composite unique if present
  const hasCompositeUnique =
    // @ts-ignore – crude runtime check via Prisma metadata is not available,
    // so we just try upsert and fall back if it errors.
    true;

  try {
    await prisma.familyMember.upsert({
      where: {
        // Works only if you defined: @@unique([familyId, joinedUserId])
        familyId_joinedUserId: { familyId: family.id, joinedUserId: userId },
      } as any,
      create: {
        familyId: family.id,
        joinedUserId: userId,
        name: "", // required by your schema
      },
      update: {},
    });
  } catch {
    // Fallback if you don't actually have the composite unique:
    const existing = await prisma.familyMember.findFirst({
      where: { familyId: family.id, joinedUserId: userId },
      select: { id: true },
    });
    if (!existing) {
      await prisma.familyMember.create({
        data: {
          familyId: family.id,
          joinedUserId: userId,
          name: "",
        },
      });
    }
  }

  await prisma.invitation.update({
    where: { id: invite.id },
    data: { status: "accepted" },
  });

  redirect("/family");
}
