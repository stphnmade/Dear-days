"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
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
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copyModalOpen, setCopyModalOpen] = useState(false);
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "error">("idle");
  const [state, formAction, pending] = useActionState(createInvite, initialState);
  const selectedDefault =
    defaultFamilyId ?? groups[0]?.id ?? "";

  const inviteUrl = useMemo(() => {
    if (!state?.token) return "";
    if (typeof window === "undefined") return `/invite/${state.token}`;
    return `${window.location.origin}/invite/${state.token}`;
  }, [state?.token]);

  useEffect(() => {
    setMounted(true);
  }, []);

  async function copyInviteLink() {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopyStatus("copied");
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopyStatus("error");
    }
  }

  function openCopyModal() {
    if (!inviteUrl) return;
    setOpen(false);
    setCopyModalOpen(true);
    setCopyStatus("idle");
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={buttonClassName}>
        {buttonLabel}
      </button>

      {mounted && open
        ? createPortal(
            <div className="dd-modal-root overflow-y-auto dd-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="invite-modal-title">
              <div className="flex min-h-full items-center justify-center p-4">
                <div className="w-full max-w-lg max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl p-6 shadow-xl dd-modal-panel">
                  <div className="mb-4 flex items-center justify-between gap-4">
                    <h2 id="invite-modal-title" className="text-xl font-semibold">Invite People</h2>
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
                        onClick={openCopyModal}
                      >
                        {copied ? "Copied" : "Copy link"}
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>,
            document.body
          )
        : null}

      {mounted && copyModalOpen
        ? createPortal(
            <div className="dd-modal-root overflow-y-auto dd-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="copy-link-modal-title">
              <div className="flex min-h-full items-center justify-center p-4">
                <div className="w-full max-w-md rounded-2xl p-5 shadow-xl dd-modal-panel">
                  <h3 id="copy-link-modal-title" className="text-lg font-semibold">Invite Link Ready</h3>
                  <p className="mt-1 text-sm dd-text-muted">
                    Share this link with the person you want to invite.
                  </p>

                  <div className="mt-3">
                    <label htmlFor="invite-link-output" className="mb-1 block text-xs dd-text-muted">
                      Group invite link
                    </label>
                    <input
                      id="invite-link-output"
                      className="w-full rounded-xl px-3 py-2 text-sm dd-field"
                      value={inviteUrl}
                      readOnly
                      onFocus={(e) => e.currentTarget.select()}
                    />
                  </div>

                  <p className="mt-2 text-xs dd-text-muted" aria-live="polite">
                    {copyStatus === "copied"
                      ? "Copied."
                      : copyStatus === "error"
                      ? "Clipboard access blocked. Long-press the link field to copy."
                      : "Tap Copy link to place it in your clipboard."}
                  </p>

                  <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
                    <button
                      type="button"
                      className="rounded-xl px-3 py-2 text-sm dd-btn-neutral"
                      onClick={() => void copyInviteLink()}
                    >
                      Copy link
                    </button>
                    <button
                      type="button"
                      className="rounded-xl px-3 py-2 text-sm dd-btn-neutral"
                      onClick={() => {
                        setCopyModalOpen(false);
                        setOpen(true);
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="rounded-xl px-3 py-2 text-sm dd-btn-primary"
                      onClick={() => {
                        setCopyModalOpen(false);
                        setOpen(false);
                      }}
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
}
