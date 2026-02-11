"use client";

import { useState } from "react";

export default function SyncPauseToggle({ initialPaused }: { initialPaused: boolean }) {
  const [paused, setPaused] = useState(initialPaused);
  const [saving, setSaving] = useState(false);

  async function onToggle(next: boolean) {
    setPaused(next);
    setSaving(true);
    try {
      const res = await fetch("/api/connections/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ syncPaused: next }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? "Failed to update sync state");
      }
    } catch {
      setPaused(!next);
    } finally {
      setSaving(false);
    }
  }

  return (
    <label className="inline-flex items-center gap-2 rounded-full border border-[var(--dd-border)] px-3 py-2 text-sm dd-card">
      <span>{paused ? "Sync Paused" : "Pause All Syncing"}</span>
      <input
        type="checkbox"
        checked={paused}
        onChange={(e) => void onToggle(e.target.checked)}
        disabled={saving}
        className="h-4 w-4"
      />
    </label>
  );
}
