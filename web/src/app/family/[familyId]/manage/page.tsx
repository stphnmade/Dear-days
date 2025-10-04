// src/app/(dashboard)/family/[familyId]/manage/page.tsx  (NO "use client")
import { prisma } from "@/lib/db";
import ServerForm from "./ServerForm";

export default async function ManageFamilyPage({
  params: { familyId },
}: {
  params: { familyId: string };
}) {
  const family = await prisma.family.findUnique({ where: { id: familyId } });
  if (!family) throw new Error("Family not found");

  // Debug: confirm this is server
  console.log("ManageFamilyPage is server:", typeof window === "undefined");

  return <ServerForm family={family} />;
}
