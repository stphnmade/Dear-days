import { prisma } from "@/lib/db";
import { updateFamily } from "../../actions";
import { SubmitButton } from "@/components/SubmitButton";

export default async function ManageFamilyPage({
  params: { familyId },
}: {
  params: { familyId: string };
}) {
  const family = await prisma.family.findUnique({ where: { id: familyId } });
  if (!family) throw new Error("Family not found");

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Manage {family.name}</h1>

      {/* The action is bound on the SERVER */}
      <form action={updateFamily.bind(null, familyId)} className="space-y-4">
        <label className="block">
          <span className="text-sm">Name</span>
          <input
            name="name"
            defaultValue={family.name ?? ""}
            required
            className="input"
          />
        </label>

        {/* You can render these inputs now if you want the UI,
            but they will NOT persist until Phase 2 migration is done.
            Feel free to comment them out for now and uncomment later. */}
        <label className="block">
          <span className="text-sm">Timezone (will save after migration)</span>
          <input
            name="timezone"
            defaultValue={"America/New_York"}
            className="input"
          />
        </label>

        <label className="block">
          <span className="text-sm">
            Description (will save after migration)
          </span>
          <textarea name="description" defaultValue={""} className="textarea" />
        </label>

        <SubmitButton />
      </form>
    </div>
  );
}
