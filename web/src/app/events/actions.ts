"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getOrCreateDefaultFamily } from "@/lib/family";

function toMidnightLocal(yyyyMmDd: string) {
  const [y, m, d] = yyyyMmDd.split("-").map(Number);
  return new Date(y, m - 1, d, 12); // noon local avoids DST edge cases
}

export async function quickAddSpecialDay(form: FormData) {
  const s = await getServerSession(authOptions);
  if (!s?.user) throw new Error("Unauthorized");
  const userId = (s.user as any).id as string;

  const title = String(form.get("title") || "");
  const type = String(form.get("type") || "other");
  const date = String(form.get("date") || "");
  const person = (form.get("person") as string) || undefined;
  const notes = (form.get("notes") as string) || undefined;

  if (!title || !date) throw new Error("Missing title or date");

  const family = await getOrCreateDefaultFamily(userId);
  await prisma.specialDay.create({
    data: {
      familyId: family.id,
      userId,
      title,
      type,
      date: toMidnightLocal(date),
      person,
      notes,
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/events");
}
