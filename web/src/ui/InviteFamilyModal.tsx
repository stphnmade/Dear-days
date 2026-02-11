"use client";

import { useActionState, useMemo, useState } from "react";
import { createInvite, type InviteActionState } from "@/app/family/invite/actions";

const initialState: InviteActionState = { ok: false };

type GroupOption = {
  id: string;
  name: string;
};

type Props = {
  buttonLabel?: string;
  buttonClassName?: string;
  groups?: GroupOption[];
  defaultFamilyId?: string;
};

export default function InviteFamilyModal({
  buttonLabel = "Invite people",
  buttonClassName = "rounded-xl px-4 py-2 text-sm dd-btn-success hover:opacity-90",
  groups = [],
  defaultFamilyId,
}: Props) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [state, formAction, pending] = useActionState(createInvite, initialState);
  const selectedDefault =
    defaultFamilyId ?? groups[0]?.id ?? "";

  const inviteUrl = useMemo(() => {
    if (!state?.token) return "";
    if (typeof window === "undefined") return `/invite/${state.token}`;
    return `${window.location.origin}/invite/${state.token}`;
  }, [state?.token]);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={buttonClassName}>
        {buttonLabel}
      </button>

      {open && (
        <div className="dd-modal-root flex items-center justify-center p-4 dd-modal-backdrop">
          <div className="w-full max-w-lg rounded-2xl p-6 shadow-xl dd-modal-panel">
            <div className="mb-4 flex items-center justify-between gap-4">
              <h2 className="text-xl font-semibold">Invite People</h2>
              <button
                type="button"
                className="rounded-lg px-3 py-1.5 text-sm dd-btn-neutral"
                onClick={() => setOpen(false)}
              >
                Close
              </button>
            </div>

            <p className="mb-4 text-sm dd-text-muted">
              Generate a private invite link for your selected group. People can accept it after signing in.
            </p>

            <form action={formAction} className="space-y-3">
              {groups.length > 1 ? (
                <label className="block">
                  <span className="mb-1 block text-sm dd-text-muted">Group</span>
                  <select
                    name="familyId"
                    className="w-full rounded-xl px-3 py-2 dd-field"
                    defaultValue={selectedDefault}
                  >
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <input type="hidden" name="familyId" value={selectedDefault} />
              )}

              <button
                type="submit"
                disabled={pending}
                className="rounded-xl px-4 py-2 text-sm dd-btn-success disabled:opacity-60"
              >
                {pending ? "Creating..." : "Create Invite Link"}
              </button>
            </form>

            {state?.token ? (
              <div className="mt-4 space-y-2 rounded-xl p-3 dd-card-muted">
                <div className="text-sm font-medium">Invite link</div>
                <div className="break-all text-xs dd-text-muted">{inviteUrl}</div>
                <button
                  type="button"
                  className="rounded-lg px-3 py-1.5 text-sm dd-btn-neutral"
                  onClick={async () => {
                    if (!inviteUrl) return;
                    await navigator.clipboard.writeText(inviteUrl);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1200);
                  }}
                >
                  {copied ? "Copied" : "Copy link"}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </>
  );
}
