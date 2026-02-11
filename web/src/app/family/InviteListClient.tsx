"use client";

import React, { useState } from "react";

type Invite = { id: string; token: string; expiresAt: string };

export default function InviteListClient({ invites }: { invites: Invite[] }) {
  const [copied, setCopied] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  async function copy(text: string, id: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      // fallback
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(id);
      setTimeout(() => setCopied(null), 1500);
    }
  }

  const displayInvites = expanded ? invites : invites.slice(0, 5);

  function formatExpiry(expiresAt: string) {
    const diff = Date.parse(expiresAt) - Date.now();
    if (diff <= 0) return "expired";
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    if (days <= 1) return "expires today";
    return `expires in ${days} day${days > 1 ? "s" : ""}`;
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm dd-text-muted">Invites</div>
        {invites.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={async () => {
                const all = invites
                  .map((i) => `${window.location.origin}/invite/${i.token}`)
                  .join("\n");
                await copy(all, "__all__");
              }}
              className="rounded px-2 py-1 text-xs dd-btn-neutral"
            >
              Copy all
            </button>
            <div className="text-xs opacity-60">{invites.length}</div>
          </div>
        )}
      </div>

      <div className="mt-3 space-y-2">
        {displayInvites.length ? (
          displayInvites.map((inv) => {
            const url = `${
              typeof window !== "undefined" ? window.location.origin : ""
            }/invite/${inv.token}`;
            return (
              <div
                key={inv.id}
                className="flex items-center justify-between gap-3"
              >
                <div className="text-sm break-words max-w-[60%]">{url}</div>
                <div className="flex items-center gap-2">
                  <div className="text-xs opacity-60">
                    {formatExpiry(inv.expiresAt)}
                  </div>
                  <button
                    type="button"
                    onClick={() => copy(url, inv.id)}
                    className="rounded px-2 py-1 text-xs dd-btn-neutral"
                  >
                    {copied === inv.id ? "Copied" : "Copy"}
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-sm dd-text-muted">No pending invites</div>
        )}
      </div>

      {invites.length > 5 && (
        <div className="mt-3">
          <button
            type="button"
            className="text-sm underline"
            onClick={() => setExpanded((s) => !s)}
          >
            {expanded ? "Show less" : `Show all (${invites.length})`}
          </button>
        </div>
      )}
    </div>
  );
}
