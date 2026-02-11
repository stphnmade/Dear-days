"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";

function sanitizeEventTemplate(input: string | null | undefined) {
  const raw = (input ?? "").trim();
  if (!raw) return "{{title}}";
  const normalized = raw.slice(0, 120);
  if (!normalized.includes("{{title}}")) return `${normalized} {{title}}`;
  return normalized;
}

export async function updateFamily(familyId: string, formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Unauthorized");
  const userId = (session.user as any).id as string;

  const family = await prisma.family.findUnique({
    where: { id: familyId },
    select: { id: true, ownerId: true },
  });
  if (!family) throw new Error("Family not found");
  if (family.ownerId !== userId) throw new Error("Only owners can update group settings");

  const name = String(formData.get("name") || "").trim();
  const timezone = formData.get("timezone");
  const description = formData.get("description");
  const allowMemberPosting = formData.get("allowMemberPosting") === "on";
  const calendarLabel = String(formData.get("calendarLabel") || "").trim();
  const eventNameTemplate = sanitizeEventTemplate(
    String(formData.get("eventNameTemplate") || "")
  );

  if (!name) throw new Error("Name is required");

  const data: Prisma.FamilyUpdateInput = {
    name,
    timezone: timezone ? String(timezone).trim() : undefined,
    description: description ? String(description).trim() : undefined,
    allowMemberPosting,
    calendarLabel: calendarLabel || null,
    eventNameTemplate,
  };

  try {
    await prisma.family.update({
      where: { id: familyId },
      data,
    });
  } catch (error: any) {
    const msg = String(error?.message ?? "");
    const needsLegacyFallback =
      msg.includes("allowMemberPosting") ||
      msg.includes("calendarLabel") ||
      msg.includes("eventNameTemplate");
    if (!needsLegacyFallback) throw error;

    await prisma.family.update({
      where: { id: familyId },
      data: {
        name,
        timezone: timezone ? String(timezone).trim() : undefined,
        description: description ? String(description).trim() : undefined,
      },
    });
  }

  revalidatePath("/dashboard");
  revalidatePath("/family");
  revalidatePath(`/family/${familyId}`);
  revalidatePath("/connections");
}

export async function removeFamilyMember(familyId: string, memberId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Unauthorized");
  const userId = (session.user as any).id as string;

  const family = await prisma.family.findUnique({
    where: { id: familyId },
    select: { ownerId: true },
  });
  if (!family) throw new Error("Family not found");
  if (family.ownerId !== userId) throw new Error("Only owners can remove members");

  const member = await prisma.familyMember.findUnique({
    where: { id: memberId },
    select: { id: true, familyId: true, joinedUserId: true },
  });
  if (!member || member.familyId !== familyId) throw new Error("Member not found");
  if (member.joinedUserId && member.joinedUserId === family.ownerId) {
    throw new Error("Owner cannot be removed");
  }

  await prisma.familyMember.delete({ where: { id: memberId } });

  revalidatePath("/family");
  revalidatePath(`/family/${familyId}/manage`);
  revalidatePath("/dashboard");
}

export async function leaveFamily(familyId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Unauthorized");
  const userId = (session.user as any).id as string;

  const family = await prisma.family.findUnique({
    where: { id: familyId },
    select: { ownerId: true },
  });
  if (!family) throw new Error("Family not found");
  if (family.ownerId === userId) {
    throw new Error("Owners cannot leave their own group");
  }

  await prisma.familyMember.deleteMany({
    where: {
      familyId,
      joinedUserId: userId,
    },
  });

  revalidatePath("/family");
  revalidatePath("/dashboard");
  revalidatePath("/connections");
}
