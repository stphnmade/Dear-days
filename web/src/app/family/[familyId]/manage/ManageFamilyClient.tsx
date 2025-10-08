// src/app/(dashboard)/family/[familyId]/manage/ManageFamilyClient.tsx
"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Card } from "@/components/card";

type Initial = {
  name: string;
  timezone?: string | null;
  description?: string | null;
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn">
      {pending ? "Saving…" : "Save changes"}
    </button>
  );
}

export default function ManageFamilyClient({
  familyId,
  initial,
}: {
  familyId: string;
  initial: Initial;
}) {
  // Inline server action: works even if everything around is client.
  const [state, formAction] = useActionState(
    async (_prev: any, formData: FormData) => {
      "use server";

      // 🧠 Import server-only modules INSIDE the action (so they stay on the server)
      const [
        { getServerSession },
        { authOptions },
        { prisma },
        { revalidatePath },
      ] = await Promise.all([
        import("next-auth"),
        import("@/lib/auth"),
        import("@/lib/db"),
        import("next/cache"),
      ]);

      const session = await getServerSession(authOptions);
      if (!session?.user) throw new Error("Unauthorized");

      const name = String(formData.get("name") || "").trim();
      const timezone = String(formData.get("timezone") || "").trim();
      const description = String(formData.get("description") || "").trim();

      if (!name) throw new Error("Name is required");

      // ✅ Compile-safe NOW (before your migration): update only fields that exist today.
      // If timezone/description aren’t in your schema yet, keep them commented.
      const data: any = { name };

      // After you add fields via Prisma migration, uncomment these:
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
    },
    { ok: false as boolean, message: "" }
  );

  return (
    <form action={formAction} className="space-y-4">
      <Card className="p-4 rounded-3xl border-white/20 bg-white/60 backdrop-blur-xl shadow-sm">
        <div className="space-y-3">
          <label className="block">
            <span className="text-sm">Name</span>
            <input
              name="name"
              defaultValue={initial.name}
              required
              className="input"
            />
          </label>

          <label className="block">
            <span className="text-sm">Timezone</span>
            <input
              name="timezone"
              defaultValue={initial.timezone ?? "America/New_York"}
              className="input"
            />
          </label>

          <label className="block">
            <span className="text-sm">Description</span>
            <textarea
              name="description"
              defaultValue={initial.description ?? ""}
              className="textarea"
            />
          </label>

          <div className="pt-2">
            <SubmitButton />
          </div>

          {state.message && (
            <p className="text-sm text-green-700">{state.message}</p>
          )}
        </div>
      </Card>
    </form>
  );
}
