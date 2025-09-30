"use server";

import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getOwnedFamilyId } from "@/lib/family";

async function assertUserId() {
  const s = await getServerSession(authOptions);
  if (!s?.user) throw new Error("Unauthorized");
  return (s.user as any).id as string;
}

export async function createInvite() {
  const userId = await assertUserId();
  const familyId = await getOwnedFamilyId(userId);
  if (!familyId) throw new Error("No owned family");

  const token = crypto.randomBytes(16).toString("hex");

  await prisma.invitation.create({
    data: {
      inviterId: userId,
      familyId,
      token,
      status: "pending",
      // expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // optional override
    },
  });

  revalidatePath("/family");
}

export async function removeMember(memberId: string) {
  const userId = await assertUserId();
  const familyId = await getOwnedFamilyId(userId);
  if (!familyId) throw new Error("No owned family");

  const member = await prisma.familyMember.findUnique({
    where: { id: memberId },
    select: { id: true, familyId: true },
  });
  if (!member || member.familyId !== familyId) throw new Error("Forbidden");

  await prisma.familyMember.delete({ where: { id: memberId } });
  revalidatePath("/family");
}
