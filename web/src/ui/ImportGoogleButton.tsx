"use client";
import { useState } from "react";

export default function ImportGoogleButton() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const doImport = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const body = { migrateAll };
      const res = await fetch("/api/connections/import-google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      const returnedMessage = data?.error ?? data?.message ?? null;
      if (!res.ok) {
        const msg = returnedMessage ?? "Import failed";
        setMessage(msg);
        // If tokens are invalid/revoked, immediately redirect to Google sign-in
        if (
          typeof msg === "string" &&
          msg.toLowerCase().includes("invalid_grant")
        ) {
          // small delay so the message renders for a moment
          setTimeout(() => {
            window.location.href = "/api/auth/signin/google";
          }, 250);
          return;
        }
        // If account isn't connected, prompt connect
        if (
          typeof msg === "string" &&
          msg.toLowerCase().includes("google account not connected")
        ) {
          window.location.href = "/api/auth/signin/google";
          return;
        }
      } else {
        setMessage(
          `Imported: ${data.result.created} created, ${data.result.updated} updated, ${data.result.skipped} skipped`
        );
      }
    } catch (err: any) {
      setMessage(err?.message ?? String(err));
    } finally {
      setLoading(false);
    }
  };

  const [migrateAll, setMigrateAll] = useState(false);

  return (
    <div>
      <div className="flex items-center gap-3">
        <button
          onClick={doImport}
          disabled={loading}
          className="rounded-xl border px-4 py-2 hover:opacity-90"
          aria-busy={loading}
        >
          {loading ? "Importing…" : "Import from Google Calendar"}
        </button>
        <label className="inline-flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={migrateAll}
            onChange={(e) => setMigrateAll(e.target.checked)}
            className="w-4 h-4"
          />
          Migrate all events
        </label>
      </div>
      {message && (
        <div
          className="mt-2 text-sm text-slate-600"
          role="status"
          aria-live="polite"
        >
          {message}
        </div>
      )}
    </div>
  );
}
