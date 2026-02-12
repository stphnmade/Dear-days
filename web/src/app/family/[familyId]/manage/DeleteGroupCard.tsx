"use client";

import { useActionState, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import type { DeleteFamilyState } from "../../actions";

const INITIAL_STATE: DeleteFamilyState = { error: null };

function DeleteGroupButton({ enabled }: { enabled: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={!enabled || pending}
      className="rounded-xl px-3 py-1.5 text-sm dd-btn-danger disabled:opacity-60"
    >
      {pending ? "Deleting..." : "Delete group"}
    </button>
  );
}

export default function DeleteGroupCard({
  groupName,
  action,
}: {
  groupName: string;
  action: (
    prevState: DeleteFamilyState,
    formData: FormData
  ) => Promise<DeleteFamilyState>;
}) {
  const [state, formAction] = useActionState(action, INITIAL_STATE);
  const [phrase, setPhrase] = useState("");
  const isConfirmed = useMemo(
    () => phrase.trim().toLowerCase() === "delete group",
    [phrase]
  );

  return (
    <section className="rounded-2xl border border-[#4B1E1E] p-5 dd-card">
      <h2 className="text-lg font-semibold text-[#FCA5A5]">Delete Group</h2>
      <p className="mt-1 text-sm dd-text-muted">
        This permanently deletes <span className="font-medium text-white">{groupName}</span> and
        all related events, invites, and member links.
      </p>
      <p className="mt-2 text-sm dd-text-muted">
        Type <span className="font-medium text-white">delete group</span> to confirm.
      </p>

      <form action={formAction} className="mt-4 space-y-3">
        <label className="block">
          <span className="mb-1 block text-xs uppercase tracking-wide dd-text-muted">
            Confirmation phrase
          </span>
          <input
            name="confirmationPhrase"
            value={phrase}
            onChange={(e) => setPhrase(e.target.value)}
            placeholder="delete group"
            className="w-full rounded-xl px-3 py-2 dd-field"
            autoComplete="off"
            required
          />
        </label>

        <DeleteGroupButton enabled={isConfirmed} />
        {!isConfirmed ? (
          <p className="text-xs dd-text-muted">
            Enter the phrase exactly to enable deletion.
          </p>
        ) : null}

        {state.error ? <p className="text-sm dd-text-danger">{state.error}</p> : null}
      </form>
    </section>
  );
}
