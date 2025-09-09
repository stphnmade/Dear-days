// src/app/events/new/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { specialDaySchema } from "@/lib/validation";
import { getOrCreateDefaultFamily } from "@/lib/family"; // 👈 add this

const assertUserId = async (): Promise<string> => {
  const s = await getServerSession(authOptions);
  if (!s?.user) throw new Error("Unauthorized");
  return (s.user as any).id as string;
};

// ✅ ADD THIS
export async function quickAddSpecialDay(formData: FormData) {
  const userId = await assertUserId();

  // Validate shape
  const parsed = specialDaySchema.safeParse({
    title: formData.get("title"),
    type: formData.get("type") || "other",
    date: formData.get("date"),
    person: formData.get("person") || null,
    notes: formData.get("notes") || null,
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid input");
  }

  const { title, type, date, person, notes } = parsed.data;

  // Convert YYYY-MM-DD → Date (noon local to avoid DST edge cases)
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(y, m - 1, d, 12);

  // Ensure the user has a family to attach to
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

  // Refresh pages that show events
  revalidatePath("/dashboard");
  revalidatePath("/events");
}

// (your existing actions)
export async function deleteEvent(id: string) {
  await assertUserId();
  await prisma.specialDay.delete({ where: { id } });
  revalidatePath("/dashboard");
}

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

  await prisma.specialDay.update({
    where: { id },
    data: {
      userId,
      title,
      type,
      date: dt,
      person: person || undefined,
      notes: notes || undefined,
    },
  });

  revalidatePath("/dashboard");
}
