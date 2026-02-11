// src/app/events/new/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { specialDaySchema } from "@/lib/validation";
import { getPrimaryFamilyId } from "@/lib/family";

const assertUserId = async (): Promise<string> => {
  const s = await getServerSession(authOptions);
  if (!s?.user) throw new Error("Unauthorized");
  return (s.user as any).id as string;
};

// Create
export async function quickAddSpecialDay(formData: FormData) {
  const userId = await assertUserId();
  const redirectToRaw = formData.get("redirectTo")?.toString().trim();
  const redirectTo =
    redirectToRaw && redirectToRaw.startsWith("/") ? redirectToRaw : "/events";
  const scope =
    formData.get("scope")?.toString() === "family" ? "family" : "personal";
  const targetFamilyId = formData.get("targetFamilyId")?.toString().trim();

  const parsed = specialDaySchema.safeParse({
    title: formData.get("title"),
    type: formData.get("type") || "other",
    date: formData.get("date"),
    person: formData.get("person") || null,
    notes: formData.get("notes") || null,
  });
  if (!parsed.success)
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid input");

  const { title, type, date, person, notes } = parsed.data;

  // date at noon (DST-safe)
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(y, m - 1, d, 12);

  let familyId: string | undefined;
  if (scope === "family") {
    const effectiveFamilyId = targetFamilyId || (await getPrimaryFamilyId(userId));
    if (!effectiveFamilyId) {
      throw new Error("No group selected.");
    }
    let family: { id: string; ownerId: string; allowMemberPosting: boolean } | null =
      null;
    try {
      family = await prisma.family.findFirst({
        where: {
          id: effectiveFamilyId,
          OR: [{ ownerId: userId }, { members: { some: { joinedUserId: userId } } }],
        },
        select: { id: true, ownerId: true, allowMemberPosting: true },
      });
    } catch (error: any) {
      const msg = String(error?.message ?? "");
      if (!msg.includes("allowMemberPosting")) throw error;
      const legacyFamily = await prisma.family.findFirst({
        where: {
          id: effectiveFamilyId,
          OR: [{ ownerId: userId }, { members: { some: { joinedUserId: userId } } }],
        },
        select: { id: true, ownerId: true },
      });
      family = legacyFamily
        ? { ...legacyFamily, allowMemberPosting: true }
        : null;
    }
    if (!family) throw new Error("You do not have access to this group.");
    const isOwner = family.ownerId === userId;
    if (!isOwner && !family.allowMemberPosting) {
      throw new Error("Only owners can post dates to this group.");
    }
    familyId = family.id;
  }

  await prisma.specialDay.create({
    data: {
      familyId,
      userId,
      title,
      type,
      date: dt,
      person: person || undefined,
      notes: notes || undefined,
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/events");
  revalidatePath(redirectTo);
  redirect(redirectTo);
}

// Delete (secured)
export async function deleteEvent(id: string) {
  const userId = await assertUserId();

  const evt = await prisma.specialDay.findUnique({
    where: { id },
    select: {
      id: true,
      userId: true,
      familyId: true,
      family: {
        select: {
          ownerId: true,
          allowMemberPosting: true,
          members: {
            where: { joinedUserId: userId },
            select: { id: true },
            take: 1,
          },
        },
      },
    },
  });
  if (!evt) throw new Error("Not found");

  const isOwner = evt.family?.ownerId === userId;
  const isMember = (evt.family?.members.length ?? 0) > 0;
  const canDelete = evt.familyId
    ? isOwner ||
      (isMember &&
        evt.userId === userId &&
        Boolean(evt.family?.allowMemberPosting))
    : evt.userId === userId;
  if (!canDelete) throw new Error("Forbidden");

  await prisma.specialDay.delete({ where: { id } });

  revalidatePath("/dashboard");
  revalidatePath("/events");
}

// Update (secured)
export async function updateEvent(formData: FormData) {
  const userId = await assertUserId();

  const id = String(formData.get("id"));
  const parsed = specialDaySchema.safeParse({
    title: formData.get("title"),
    type: formData.get("type") || "other",
    date: formData.get("date"),
    person: formData.get("person") || null,
    notes: formData.get("notes") || null,
  });
  if (!parsed.success)
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid input");

  const { title, type, date, person, notes } = parsed.data;
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(y, m - 1, d, 12);

  const evt = await prisma.specialDay.findUnique({
    where: { id },
    select: {
      id: true,
      userId: true,
      familyId: true,
      family: {
        select: {
          ownerId: true,
          allowMemberPosting: true,
          members: {
            where: { joinedUserId: userId },
            select: { id: true },
            take: 1,
          },
        },
      },
    },
  });
  if (!evt) throw new Error("Not found");

  const isOwner = evt.family?.ownerId === userId;
  const isMember = (evt.family?.members.length ?? 0) > 0;
  const canUpdate = evt.familyId
    ? isOwner ||
      (isMember &&
        evt.userId === userId &&
        Boolean(evt.family?.allowMemberPosting))
    : evt.userId === userId;
  if (!canUpdate) throw new Error("Forbidden");

  await prisma.specialDay.update({
    where: { id },
    data: {
      // do NOT change familyId here
      userId, // keep last editor id if you want
      title,
      type,
      date: dt,
      person: person || undefined,
      notes: notes || undefined,
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/events");
}
