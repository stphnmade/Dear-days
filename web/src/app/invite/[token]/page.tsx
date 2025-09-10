import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getOrCreateDefaultFamily } from "@/lib/family";

export default async function AcceptInvite({
  params,
}: {
  params: { token: string };
}) {
  const s = await getServerSession(authOptions);
  if (!s?.user) redirect("/api/auth/signin");
  const meId = (s.user as any).id as string;

  const inv = await prisma.invitation.findUnique({
    where: { token: params.token },
  });
  if (!inv || inv.status !== "pending" || inv.expiresAt < new Date()) {
    return <main className="p-6">Invite is invalid or expired.</main>;
  }

  await prisma.invitation.update({
    where: { token: params.token },
    data: { status: "accepted" },
  });

  // Put both of you into inviter’s default family (create if missing)
  const fam = await getOrCreateDefaultFamily(inv.inviterId);

  await prisma.familyMember.upsert({
    where: { familyId_joinedUserId: { familyId: fam.id, joinedUserId: meId } },
    update: {},
    create: {
      familyId: fam.id,
      name: "You",
      joinedUserId: meId,
      relation: "family",
    },
  });

  redirect("/family");
}
