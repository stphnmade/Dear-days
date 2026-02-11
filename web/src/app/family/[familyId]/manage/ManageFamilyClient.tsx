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
  initial,
  action,
}: {
  initial: Initial;
  // action is a server action bound on the server page
  // action receives (prevState, payload) to match useActionState signature
  action: (
    prev: any,
    formData: FormData
  ) => Promise<{ ok: boolean; message: string }>;
}) {
  // Use the server action passed from the server page
  const [state, formAction] = useActionState(action, {
    ok: false as boolean,
    message: "",
  });

  return (
    <form action={formAction} className="space-y-4">
      <Card className="p-4">
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
            <p className="text-sm dd-text-success">{state.message}</p>
          )}
        </div>
      </Card>
    </form>
  );
}
