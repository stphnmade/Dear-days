"use client";

import { useMemo, useState } from "react";

type SyncSettings = {
  syncPaused: boolean;
  conflictHandling: "highlight" | "hide_overlaps" | "ignore";
  defaultEventDestination: "DEAR_DAYS_LOCAL" | "GOOGLE_PRIMARY" | "GROUP_SHARED";
  syncBirthdays: boolean;
  syncGroupMeetings: boolean;
  syncReminders: boolean;
  googlePullEnabled: boolean;
  googlePushEnabled: boolean;
  googleCalendarScopes: string[];
  lastGlobalRefreshAt: string | null;
};

type GoogleCalendarItem = {
  id: string;
  summary: string;
  primary: boolean;
  accessRole: string;
};

const EMPTY_SETTINGS: SyncSettings = {
  syncPaused: false,
  conflictHandling: "highlight",
  defaultEventDestination: "DEAR_DAYS_LOCAL",
  syncBirthdays: true,
  syncGroupMeetings: true,
  syncReminders: true,
  googlePullEnabled: true,
  googlePushEnabled: true,
  googleCalendarScopes: [],
  lastGlobalRefreshAt: null,
};

export default function ImportGoogleButton({
  familyId,
  connected,
  initialSettings,
}: {
  familyId: string;
  connected: boolean;
  initialSettings: SyncSettings;
}) {
  const [settings, setSettings] = useState<SyncSettings>(initialSettings ?? EMPTY_SETTINGS);
  const [calendars, setCalendars] = useState<GoogleCalendarItem[]>([]);
  const [showScopes, setShowScopes] = useState(false);
  const [loadingCalendars, setLoadingCalendars] = useState(false);
  const [syncingState, setSyncingState] = useState<"idle" | "loading" | "done">("idle");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [watchLoading, setWatchLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<any>(null);

  const canSync = connected && !settings.syncPaused && settings.googlePullEnabled;

  const selectedCalendarIds = useMemo(() => {
    if (settings.googleCalendarScopes.length) return settings.googleCalendarScopes;
    return ["primary"];
  }, [settings.googleCalendarScopes]);

  async function persistSettings(next: Partial<SyncSettings>) {
    const merged = { ...settings, ...next };
    setSettings(merged);
    try {
      const res = await fetch("/api/connections/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed to save settings");
      setSettings(data.settings as SyncSettings);
    } catch (e: any) {
      setError(e?.message ?? "Failed to save settings");
    }
  }

  async function openScopes() {
    setShowScopes((v) => !v);
    if (calendars.length) return;

    setLoadingCalendars(true);
    setError(null);
    try {
      const res = await fetch("/api/connections/google-calendars", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Could not load calendar list");
      setCalendars(data.calendars ?? []);
      if (Array.isArray(data.selectedCalendarIds)) {
        setSettings((prev) => ({ ...prev, googleCalendarScopes: data.selectedCalendarIds }));
      }
    } catch (e: any) {
      setError(e?.message ?? "Could not load calendar list");
    } finally {
      setLoadingCalendars(false);
    }
  }

  function toggleScope(id: string) {
    const exists = settings.googleCalendarScopes.includes(id);
    const next = exists
      ? settings.googleCalendarScopes.filter((x) => x !== id)
      : [...settings.googleCalendarScopes, id];
    void persistSettings({ googleCalendarScopes: next });
  }

  async function runSync(dryRun: boolean) {
    if (!canSync && !dryRun) return;

    setError(null);
    setMessage(null);
    if (dryRun) setPreviewLoading(true);
    else {
      setSyncingState("loading");
      setPreview(null);
    }

    try {
      const res = await fetch("/api/connections/import-google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          familyId,
          dryRun,
          migrateAll: true,
          calendarIds: selectedCalendarIds,
          syncBirthdays: settings.syncBirthdays,
          syncGroupMeetings: settings.syncGroupMeetings,
          syncReminders: settings.syncReminders,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Google sync failed");

      const result = data.result;
      if (dryRun) {
        setPreview(result);
        setMessage(
          `Preview: ${result.created} add, ${result.updated} update, ${result.skipped} skip across ${result.calendars?.length ?? 0} calendars.`
        );
      } else {
        setMessage(
          `Synced: ${result.created} added, ${result.updated} updated, ${result.skipped} skipped.`
        );
        setSyncingState("done");
        setTimeout(() => setSyncingState("idle"), 1400);
        const refreshed = await fetch("/api/connections/settings", { cache: "no-store" });
        const refreshedData = await refreshed.json();
        if (refreshed.ok && refreshedData?.settings) {
          setSettings(refreshedData.settings as SyncSettings);
        }
      }
    } catch (e: any) {
      setError(e?.message ?? "Google sync failed");
      setSyncingState("idle");
    } finally {
      setPreviewLoading(false);
    }
  }

  async function enableRealtimeWatch() {
    setWatchLoading(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/calendar/google/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ calendarId: selectedCalendarIds[0] ?? "primary" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Could not enable real-time sync");
      if (data?.watchEnabled) {
        setMessage("Real-time Google webhook sync enabled.");
      } else {
        setMessage(data?.warning ?? "Google connected, but webhook watch was not enabled.");
      }
    } catch (e: any) {
      setError(e?.message ?? "Could not enable real-time sync");
    } finally {
      setWatchLoading(false);
    }
  }

  async function connectGoogleWithPopup() {
    setError(null);
    const callbackUrl = `/connections?familyId=${encodeURIComponent(familyId)}`;
    const target = `/api/auth/signin/google?callbackUrl=${encodeURIComponent(callbackUrl)}`;

    const popup = window.open(
      target,
      "dd-google-oauth",
      "popup=yes,width=520,height=720"
    );

    if (!popup) {
      window.location.href = target;
      return;
    }

    const timer = window.setInterval(() => {
      if (!popup.closed) return;
      window.clearInterval(timer);
      window.location.reload();
    }, 450);
  }

  return (
    <div className="space-y-4">
      {!connected ? (
        <div className="space-y-3">
          <button
            type="button"
            onClick={connectGoogleWithPopup}
            className="rounded-xl px-4 py-2 text-sm dd-btn-primary"
          >
            Connect Google (OAuth Popup)
          </button>
          <p className="text-xs dd-text-muted">
            Required scopes: `calendar.events` and `calendar.readonly`.
          </p>
        </div>
      ) : (
        <>
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="flex items-center justify-between rounded-xl border border-[var(--dd-border)] px-3 py-2 text-sm">
              <span>Pull from Google</span>
              <input
                type="checkbox"
                checked={settings.googlePullEnabled}
                onChange={(e) => void persistSettings({ googlePullEnabled: e.target.checked })}
                className="h-4 w-4"
              />
            </label>
            <label className="flex items-center justify-between rounded-xl border border-[var(--dd-border)] px-3 py-2 text-sm">
              <span>Push to Google</span>
              <input
                type="checkbox"
                checked={settings.googlePushEnabled}
                onChange={(e) => void persistSettings({ googlePushEnabled: e.target.checked })}
                className="h-4 w-4"
              />
            </label>
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            <label className="flex items-center gap-2 rounded-xl border border-[var(--dd-border)] px-3 py-2 text-sm">
              <input
                type="checkbox"
                checked={settings.syncBirthdays}
                onChange={(e) => void persistSettings({ syncBirthdays: e.target.checked })}
                className="h-4 w-4"
              />
              Sync Birthdays
            </label>
            <label className="flex items-center gap-2 rounded-xl border border-[var(--dd-border)] px-3 py-2 text-sm">
              <input
                type="checkbox"
                checked={settings.syncGroupMeetings}
                onChange={(e) =>
                  void persistSettings({ syncGroupMeetings: e.target.checked })
                }
                className="h-4 w-4"
              />
              Sync Group Meetings
            </label>
            <label className="flex items-center gap-2 rounded-xl border border-[var(--dd-border)] px-3 py-2 text-sm">
              <input
                type="checkbox"
                checked={settings.syncReminders}
                onChange={(e) => void persistSettings({ syncReminders: e.target.checked })}
                className="h-4 w-4"
              />
              Sync Reminders
            </label>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={openScopes}
              className="rounded-xl px-3 py-2 text-sm dd-btn-neutral"
            >
              Manage Scopes
            </button>
            <button
              type="button"
              onClick={() => void runSync(true)}
              disabled={!connected || previewLoading}
              className="rounded-xl px-3 py-2 text-sm dd-btn-neutral disabled:opacity-50"
            >
              {previewLoading ? "Previewing..." : "Preview Sync Changes"}
            </button>
            <button
              type="button"
              onClick={() => void runSync(false)}
              disabled={!canSync || syncingState === "loading"}
              className="rounded-xl px-4 py-2 text-sm dd-btn-primary disabled:opacity-50"
            >
              {syncingState === "loading"
                ? "Syncing..."
                : syncingState === "done"
                ? "Synced ✓"
                : "Sync Now"}
            </button>
            <button
              type="button"
              onClick={() => void enableRealtimeWatch()}
              disabled={!connected || watchLoading}
              className="rounded-xl px-3 py-2 text-sm dd-btn-neutral disabled:opacity-50"
            >
              {watchLoading ? "Enabling..." : "Enable Realtime"}
            </button>
          </div>

          {showScopes ? (
            <div className="rounded-xl border border-[var(--dd-border)] p-3">
              <div className="mb-2 text-xs dd-text-muted">
                Choose specific Google sub-calendars Dear Days may read.
              </div>
              {loadingCalendars ? (
                <div className="text-sm dd-text-muted">Loading calendars...</div>
              ) : calendars.length ? (
                <div className="space-y-2">
                  {calendars.map((c) => {
                    const checked = settings.googleCalendarScopes.includes(c.id);
                    return (
                      <label key={c.id} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleScope(c.id)}
                          className="h-4 w-4"
                        />
                        <span>{c.summary}</span>
                        {c.primary ? <span className="text-xs dd-text-muted">(Primary)</span> : null}
                      </label>
                    );
                  })}
                </div>
              ) : (
                <div className="text-sm dd-text-muted">No calendars found.</div>
              )}
            </div>
          ) : null}

          {preview ? (
            <div className="rounded-xl border border-[var(--dd-border)] p-3 text-xs">
              <div className="font-medium">Dry-run result</div>
              <div className="mt-1">
                {preview.created} add · {preview.updated} update · {preview.skipped} skip
              </div>
              {Array.isArray(preview.calendars) && preview.calendars.length ? (
                <div className="mt-2 space-y-1 dd-text-muted">
                  {preview.calendars.map((c: any) => (
                    <div key={c.calendarId}>
                      {c.calendarId}: +{c.created} / ~{c.updated} / -{c.skipped}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </>
      )}

      {message ? (
        <div className="text-sm dd-text-success" role="status" aria-live="polite">
          {message}
        </div>
      ) : null}
      {error ? <div className="text-sm dd-text-danger">{error}</div> : null}
    </div>
  );
}
