// src/app/(dashboard)/family/[familyId]/manage/page.tsx
import { prisma } from "@/lib/db";
import ManageFamilyClient from "./ManageFamilyClient";

export default async function ManageFamilyPage({
  params: { familyId },
}: {
  params: { familyId: string };
}) {
  const family = await prisma.family.findUnique({ where: { id: familyId } });
  if (!family) throw new Error("Family not found");

  return (
    <ManageFamilyClient
      familyId={familyId}
      initial={{
        name: family.name ?? "",
        // These may be null/undefined if you haven't migrated yet; it's fine.
        timezone: (family as any).timezone ?? "America/New_York",
        description: (family as any).description ?? "",
      }}
    />
  );
}
