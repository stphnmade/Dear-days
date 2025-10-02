"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";

export async function updateFamily(familyId: string, formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Unauthorized");

  const name = String(formData.get("name") || "").trim();
  const timezone = formData.get("timezone");
  const description = formData.get("description");

  if (!name) throw new Error("Name is required");

  const data: Prisma.FamilyUpdateInput = {
    name,
    timezone: timezone ? String(timezone).trim() : undefined,
    description: description ? String(description).trim() : undefined,
  };

  await prisma.family.update({
    where: { id: familyId },
    data,
  });

  revalidatePath("/dashboard");
  revalidatePath(`/family/${familyId}`);
}
