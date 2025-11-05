"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function updateFamilyAction(formData: FormData, familyId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Unauthorized");

  const name = String(formData.get("name") || "").trim();
  const timezone = String(formData.get("timezone") || "").trim();
  const description = String(formData.get("description") || "").trim();

  if (!name) throw new Error("Name is required");

  const data: any = { name };
  if (timezone) data.timezone = timezone;
  if (description) data.description = description;

  await prisma.family.update({
    where: { id: familyId },
    data,
  });

  await Promise.all([
    revalidatePath("/dashboard"),
    revalidatePath(`/family/${familyId}`),
  ]);

  return { ok: true, message: "Saved" };
}
