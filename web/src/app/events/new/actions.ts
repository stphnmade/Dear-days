// src/app/events/new/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { specialDaySchema } from "@/lib/validation";
import { getOrCreateDefaultFamily, getOwnedFamilyId } from "@/lib/family";

const assertUserId = async (): Promise<string> => {
  const s = await getServerSession(authOptions);
  if (!s?.user) throw new Error("Unauthorized");
  return (s.user as any).id as string;
};

// Create
export async function quickAddSpecialDay(formData: FormData) {
  const userId = await assertUserId();

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

  const family = await getOrCreateDefaultFamily(userId);

  await prisma.specialDay.create({
    data: {
      familyId: family.id,
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
}

// Delete (secured)
export async function deleteEvent(id: string) {
  const userId = await assertUserId();

  // Only allow delete if the event belongs to the user OR their owned family
  const ownedFamilyId = await getOwnedFamilyId(userId);
  const evt = await prisma.specialDay.findUnique({
    where: { id },
    select: { id: true, userId: true, familyId: true },
  });
  if (!evt) throw new Error("Not found");

  const canDelete =
    evt.userId === userId ||
    (!!ownedFamilyId && evt.familyId === ownedFamilyId);
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

  const ownedFamilyId = await getOwnedFamilyId(userId);
  const evt = await prisma.specialDay.findUnique({
    where: { id },
    select: { id: true, userId: true, familyId: true },
  });
  if (!evt) throw new Error("Not found");

  const canUpdate =
    evt.userId === userId ||
    (!!ownedFamilyId && evt.familyId === ownedFamilyId);
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
