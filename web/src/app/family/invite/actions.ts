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

export type InviteActionState = {
  ok: boolean;
  token?: string;
  familyId?: string;
};

export async function createInvite(
  _prevState?: InviteActionState,
  _formData?: FormData
): Promise<InviteActionState> {
  const userId = await assertUserId();
  const requestedFamilyId = _formData?.get("familyId")?.toString().trim();
  let familyId = "";

  if (requestedFamilyId) {
    const target = await prisma.family.findFirst({
      where: {
        id: requestedFamilyId,
        OR: [{ ownerId: userId }, { members: { some: { joinedUserId: userId } } }],
      },
      select: { id: true },
    });
    if (!target) throw new Error("You do not have access to this group.");
    familyId = target.id;
  } else {
    // Ensure a personal owned group exists as fallback.
    familyId = await (await import("@/lib/family")).ensureOwnedFamilyId(userId);
  }

  // Get the user to access their name
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true },
  });

  // Ensure the creator is a member of the family
  if (user) {
    await prisma.familyMember.upsert({
      where: {
        familyId_joinedUserId: { familyId, joinedUserId: userId },
      } as any,
      create: {
        name: "You", // Display "You" for the creator
        family: { connect: { id: familyId } },
        user: { connect: { id: userId } },
      },
      update: {},
    });
  }

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
  revalidatePath("/dashboard");
  return { ok: true, token, familyId };
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
