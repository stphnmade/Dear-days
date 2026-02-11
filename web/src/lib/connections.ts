import type { Prisma } from "@prisma/client";

export const CONFLICT_HANDLING_OPTIONS = [
  "highlight",
  "hide_overlaps",
  "ignore",
] as const;

export const DEFAULT_EVENT_DESTINATIONS = [
  "DEAR_DAYS_LOCAL",
  "GOOGLE_PRIMARY",
  "GROUP_SHARED",
] as const;

export type ConflictHandling = (typeof CONFLICT_HANDLING_OPTIONS)[number];
export type DefaultEventDestination = (typeof DEFAULT_EVENT_DESTINATIONS)[number];

export type SyncSettings = {
  syncPaused: boolean;
  conflictHandling: ConflictHandling;
  defaultEventDestination: DefaultEventDestination;
  syncBirthdays: boolean;
  syncGroupMeetings: boolean;
  syncReminders: boolean;
  googlePullEnabled: boolean;
  googlePushEnabled: boolean;
  googleCalendarScopes: string[];
  lastGlobalRefreshAt: string | null;
};

function isConflictHandling(value: string): value is ConflictHandling {
  return (CONFLICT_HANDLING_OPTIONS as readonly string[]).includes(value);
}

function isDefaultDestination(value: string): value is DefaultEventDestination {
  return (DEFAULT_EVENT_DESTINATIONS as readonly string[]).includes(value);
}

export function normalizeCalendarScopes(input: string | null | undefined): string[] {
  if (!input) return [];
  const deduped = new Set(
    input
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  );
  return [...deduped];
}

export function serializeCalendarScopes(input: string[] | null | undefined): string | null {
  if (!input?.length) return null;
  const deduped = new Set(input.map((s) => s.trim()).filter(Boolean));
  const value = [...deduped].join(",");
  return value || null;
}

export function normalizeConflictHandling(
  value: string | null | undefined
): ConflictHandling {
  if (!value) return "highlight";
  return isConflictHandling(value) ? value : "highlight";
}

export function normalizeDefaultDestination(
  value: string | null | undefined
): DefaultEventDestination {
  if (!value) return "DEAR_DAYS_LOCAL";
  return isDefaultDestination(value) ? value : "DEAR_DAYS_LOCAL";
}

export function settingsUpdateDataFromBody(body: {
  syncPaused?: unknown;
  conflictHandling?: unknown;
  defaultEventDestination?: unknown;
  syncBirthdays?: unknown;
  syncGroupMeetings?: unknown;
  syncReminders?: unknown;
  googlePullEnabled?: unknown;
  googlePushEnabled?: unknown;
  googleCalendarScopes?: unknown;
}): Prisma.UserUpdateInput {
  const data: Prisma.UserUpdateInput = {};

  if (typeof body.syncPaused === "boolean") data.syncPaused = body.syncPaused;
  if (typeof body.syncBirthdays === "boolean") data.syncBirthdays = body.syncBirthdays;
  if (typeof body.syncGroupMeetings === "boolean") {
    data.syncGroupMeetings = body.syncGroupMeetings;
  }
  if (typeof body.syncReminders === "boolean") data.syncReminders = body.syncReminders;
  if (typeof body.googlePullEnabled === "boolean") {
    data.googlePullEnabled = body.googlePullEnabled;
  }
  if (typeof body.googlePushEnabled === "boolean") {
    data.googlePushEnabled = body.googlePushEnabled;
  }

  if (typeof body.conflictHandling === "string") {
    data.conflictHandling = normalizeConflictHandling(body.conflictHandling);
  }

  if (typeof body.defaultEventDestination === "string") {
    data.defaultEventDestination = normalizeDefaultDestination(
      body.defaultEventDestination
    );
  }

  if (Array.isArray(body.googleCalendarScopes)) {
    data.googleCalendarScopes = serializeCalendarScopes(
      body.googleCalendarScopes.filter((x): x is string => typeof x === "string")
    );
  }

  return data;
}

export function mapSyncSettings(input: {
  syncPaused: boolean;
  conflictHandling: string;
  defaultEventDestination: string;
  syncBirthdays: boolean;
  syncGroupMeetings: boolean;
  syncReminders: boolean;
  googlePullEnabled: boolean;
  googlePushEnabled: boolean;
  googleCalendarScopes: string | null;
  lastGlobalRefreshAt: Date | null;
}): SyncSettings {
  return {
    syncPaused: Boolean(input.syncPaused),
    conflictHandling: normalizeConflictHandling(input.conflictHandling),
    defaultEventDestination: normalizeDefaultDestination(
      input.defaultEventDestination
    ),
    syncBirthdays: Boolean(input.syncBirthdays),
    syncGroupMeetings: Boolean(input.syncGroupMeetings),
    syncReminders: Boolean(input.syncReminders),
    googlePullEnabled: Boolean(input.googlePullEnabled),
    googlePushEnabled: Boolean(input.googlePushEnabled),
    googleCalendarScopes: normalizeCalendarScopes(input.googleCalendarScopes),
    lastGlobalRefreshAt: input.lastGlobalRefreshAt
      ? input.lastGlobalRefreshAt.toISOString()
      : null,
  };
}
