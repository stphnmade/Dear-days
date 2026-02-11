"use client";

import { useState } from "react";

type ImportMode = "url" | "file";

export default function ImportIcalPanel({
  embedded = false,
  familyId,
}: {
  embedded?: boolean;
  familyId: string;
}) {
  const [mode, setMode] = useState<ImportMode>("url");
  const [url, setUrl] = useState("");
  const [fileText, setFileText] = useState("");
  const [fileName, setFileName] = useState("");
  const [importAll, setImportAll] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  async function onPickFile(file: File | null) {
    if (!file) return;
    try {
      const text = await file.text();
      setFileText(text);
      setFileName(file.name);
      setMessage(null);
      setIsError(false);
    } catch {
      setFileText("");
      setFileName("");
      setMessage("Could not read selected file.");
      setIsError(true);
    }
  }

  async function importNow() {
    setLoading(true);
    setMessage(null);
    setIsError(false);
    try {
      const payload =
        mode === "url"
          ? { url: url.trim(), importAll, familyId }
          : { text: fileText, importAll, familyId };

      const res = await fetch("/api/connections/import-ical", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        setIsError(true);
        setMessage(data?.error ?? "iCal import failed");
        return;
      }

      const r = data.result;
      setMessage(
        `Imported iCal: ${r.created} created, ${r.updated} updated, ${r.skipped} skipped (${r.total} total).`
      );
      setIsError(false);
    } catch (err: any) {
      setMessage(err?.message ?? "iCal import failed");
      setIsError(true);
    } finally {
      setLoading(false);
    }
  }

  const canSubmit =
    !loading &&
    ((mode === "url" && url.trim().length > 0) ||
      (mode === "file" && fileText.length > 0));

  return (
    <div
      className={
        embedded
          ? ""
          : "rounded-2xl p-4 dd-card-muted"
      }
    >
      <div className="flex items-center justify-between gap-3">
        {embedded ? null : <h3 className="text-base font-semibold">Import iCal (.ics)</h3>}
        <div className="flex overflow-hidden rounded-lg border border-[var(--dd-border)]">
          <button
            type="button"
            onClick={() => setMode("url")}
            className={`px-3 py-1.5 text-sm ${mode === "url" ? "dd-btn-primary" : "dd-btn-neutral"}`}
          >
            URL
          </button>
          <button
            type="button"
            onClick={() => setMode("file")}
            className={`px-3 py-1.5 text-sm ${mode === "file" ? "dd-btn-primary" : "dd-btn-neutral"}`}
          >
            File
          </button>
        </div>
      </div>

      {embedded ? null : (
        <p className="mt-2 text-sm dd-text-muted">
          Import special days from any iCal feed or `.ics` file.
        </p>
      )}

      <div className="mt-4 space-y-3">
        {mode === "url" ? (
          <label className="block">
            <span className="text-sm dd-text-muted">iCal URL</span>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/calendar.ics"
              className="mt-1 w-full rounded-xl px-3 py-2 text-sm dd-field"
            />
          </label>
        ) : (
          <label className="block">
            <span className="text-sm dd-text-muted">iCal file</span>
            <input
              type="file"
              accept=".ics,text/calendar"
              onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
              className="mt-1 block w-full text-sm"
            />
            {fileName ? (
              <div className="mt-1 text-xs dd-text-muted">
                Selected: {fileName}
              </div>
            ) : null}
          </label>
        )}

        <label className="inline-flex items-center gap-2 text-sm dd-text-muted">
          <input
            type="checkbox"
            checked={importAll}
            onChange={(e) => setImportAll(e.target.checked)}
            className="h-4 w-4"
          />
          Import all events (not only birthdays/anniversaries)
        </label>

        <button
          type="button"
          onClick={importNow}
          disabled={!canSubmit}
          className="rounded-xl px-4 py-2 text-sm dd-btn-success hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "Importing…" : "Run iCal import"}
        </button>

        {message ? (
          <div
            role="status"
            aria-live="polite"
            className={`text-sm ${isError ? "dd-text-danger" : "dd-text-success"}`}
          >
            {message}
          </div>
        ) : null}
      </div>
    </div>
  );
}
