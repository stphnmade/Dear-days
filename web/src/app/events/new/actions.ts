"use server";

import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export async function createSpecialDay(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/");

  const userId = (session.user as any).id!;
  const title = String(formData.get("title") || "").trim();
  const type = String(formData.get("type") || "other");
  const date = new Date(String(formData.get("date"))); // YYYY-MM-DD

  if (!title || isNaN(date.getTime())) {
    throw new Error("Please provide a title and a valid date.");
  }

  await prisma.specialDay.create({
    data: {
      userId,
      title,
      type,
      date,
      notes: String(formData.get("notes") || ""),
    },
  });

  redirect("/dashboard");
}
