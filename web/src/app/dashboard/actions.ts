"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { specialDaySchema } from "@/lib/validation";
import { getOrCreateDefaultFamily } from "@/lib/family";

function toLocalDateMidnight(d: string) {
  const [y, m, day] = d.split("-").map(Number);
  return new Date(y, m - 1, day, 12); // 12:00 local to dodge DST edge cases
}

export async function quickAddSpecialDay(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Unauthorized");

  const userId = (session.user as any).id as string;
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

  // Decide: personal vs shared — quick-add goes to your shared family if it exists/created, so others can see it
  const family = await getOrCreateDefaultFamily(userId);
  await prisma.specialDay.create({
    data: {
      familyId: family.id,
      userId,
      title,
      type,
      date: toLocalDateMidnight(date),
      person: person || undefined,
      notes: notes || undefined,
    },
  });
}
