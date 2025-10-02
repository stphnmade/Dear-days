// src/app/(dashboard)/family/[familyId]/manage/page.tsx  (NO "use client")
import { prisma } from "@/lib/db";
import { updateFamily } from "../../actions";
import { Card } from "@/components/card"; // client is OK *inside* the form
import { SubmitButton } from "@/components/SubmitButton";

export default async function ManageFamilyPage({
  params: { familyId },
}: {
  params: { familyId: string };
}) {
  const family = await prisma.family.findUnique({ where: { id: familyId } });
  if (!family) throw new Error("Family not found");

  return (
    // ✅ The <form> itself is rendered in a Server Component and has no client ancestors
    <form action={updateFamily.bind(null, familyId)} className="space-y-4">
      <Card>
        {" "}
        {/* client component nested inside the form = OK */}
        <div className="space-y-3 p-4">
          <label className="block">
            <span className="text-sm">Name</span>
            <input
              name="name"
              defaultValue={family.name ?? ""}
              required
              className="input"
            />
          </label>
          {/* timezone/description will save after your migration */}
          <label className="block">
            <span className="text-sm">Timezone</span>
            <input
              name="timezone"
              defaultValue={family.timezone ?? "America/New_York"}
              className="input"
            />
          </label>
          <label className="block">
            <span className="text-sm">Description</span>
            <textarea
              name="description"
              defaultValue={family.description ?? ""}
              className="textarea"
            />
          </label>
          <SubmitButton />
        </div>
      </Card>
    </form>
  );
}
