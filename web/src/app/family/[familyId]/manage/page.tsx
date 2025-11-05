// src/app/(dashboard)/family/[familyId]/manage/page.tsx
import { prisma } from "@/lib/db";
import ManageFamilyClient from "./ManageFamilyClient";
import { updateFamilyAction } from "./actions.server";

export default async function ManageFamilyPage({
  params: { familyId },
}: {
  params: { familyId: string };
}) {
  const family = await prisma.family.findUnique({ where: { id: familyId } });
  if (!family) throw new Error("Family not found");

  // Create a bound server action that includes the current familyId and pass it
  // down to the client component. This keeps the "use server" action inside a
  // server module and avoids bundling server-only modules into client code.
  // The action hook expects signature (prev, payload). We create a wrapper
  // that ignores the previous state and calls the server action with the
  // FormData and familyId.
  const boundAction = (_prev: any, formData: FormData) =>
    updateFamilyAction(formData, familyId);

  return (
    <ManageFamilyClient
      familyId={familyId}
      action={boundAction}
      initial={{
        name: family.name ?? "",
        // These may be null/undefined if you haven't migrated yet; it's fine.
        timezone: (family as any).timezone ?? "America/New_York",
        description: (family as any).description ?? "",
      }}
    />
  );
}
