"use client";

import { useState } from "react";

type ConflictHandling = "highlight" | "hide_overlaps" | "ignore";
type DefaultEventDestination = "DEAR_DAYS_LOCAL" | "GOOGLE_PRIMARY" | "GROUP_SHARED";

export default function ConnectionPreferencesForm({
  initialConflictHandling,
  initialDefaultDestination,
}: {
  initialConflictHandling: ConflictHandling;
  initialDefaultDestination: DefaultEventDestination;
}) {
  const [conflictHandling, setConflictHandling] = useState<ConflictHandling>(
    initialConflictHandling
  );
  const [defaultDestination, setDefaultDestination] =
    useState<DefaultEventDestination>(initialDefaultDestination);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSave() {
    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const res = await fetch("/api/connections/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conflictHandling,
          defaultEventDestination: defaultDestination,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Could not save settings");
      setMessage("Preferences saved.");
    } catch (e: any) {
      setError(e?.message ?? "Could not save settings");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <label className="block">
        <span className="mb-1 block text-sm">Conflict handling</span>
        <select
          value={conflictHandling}
          onChange={(e) => setConflictHandling(e.target.value as ConflictHandling)}
          className="w-full rounded-xl px-3 py-2 dd-field"
        >
          <option value="highlight">Highlight conflicts in red</option>
          <option value="hide_overlaps">Automatically hide overlapping events</option>
          <option value="ignore">Ignore conflicts</option>
        </select>
      </label>

      <label className="block">
        <span className="mb-1 block text-sm">Default new-event destination</span>
        <select
          value={defaultDestination}
          onChange={(e) =>
            setDefaultDestination(e.target.value as DefaultEventDestination)
          }
          className="w-full rounded-xl px-3 py-2 dd-field"
        >
          <option value="DEAR_DAYS_LOCAL">Dear Days Local</option>
          <option value="GOOGLE_PRIMARY">Google Primary</option>
          <option value="GROUP_SHARED">Active Group Shared</option>
        </select>
      </label>

      <button
        type="button"
        onClick={onSave}
        disabled={saving}
        className="rounded-xl px-4 py-2 text-sm dd-btn-primary disabled:opacity-60"
      >
        {saving ? "Saving..." : "Save preferences"}
      </button>

      {message ? <div className="text-sm dd-text-success">{message}</div> : null}
      {error ? <div className="text-sm dd-text-danger">{error}</div> : null}
    </div>
  );
}
