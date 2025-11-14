// src/lib/google.ts
import { google, calendar_v3 } from "googleapis";
import { addMonths, isAfter } from "date-fns";
import { db } from "@/lib/db";

/**
 * Build an OAuth2 client for the user's Google account.
 * Reads/refreshes tokens from NextAuth Account table.
 */
export async function getGoogleClientForUser(userId: string) {
  const account = await db.account.findFirst({
    where: { userId, provider: "google" },
  });
  if (!account?.access_token) return null;

  const oauth2 = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID!,
    process.env.GOOGLE_CLIENT_SECRET!,
    `${process.env.NEXTAUTH_URL}/api/auth/callback/google`
  );

  oauth2.setCredentials({
    access_token: account.access_token || undefined,
    refresh_token: account.refresh_token || undefined,
    expiry_date: account.expires_at ? account.expires_at * 1000 : undefined,
    scope: account.scope || undefined,
    token_type: account.token_type || undefined,
    id_token: account.id_token || undefined,
  });

  // Refresh if expired
  try {
    const expired =
      !account.expires_at ||
      isAfter(new Date(), new Date(account.expires_at * 1000));
    if (expired && account.refresh_token) {
      const { credentials } = await oauth2.refreshAccessToken();
      await db.account.update({
        where: { id: account.id },
        data: {
          access_token:
            credentials.access_token ?? account.access_token ?? null,
          refresh_token:
            credentials.refresh_token ?? account.refresh_token ?? null,
          expires_at: credentials.expiry_date
            ? Math.floor(credentials.expiry_date / 1000)
            : account.expires_at ?? null,
          scope: credentials.scope ?? account.scope ?? null,
          token_type: credentials.token_type ?? account.token_type ?? null,
          id_token: (credentials as any).id_token ?? account.id_token ?? null,
        },
      });
      oauth2.setCredentials(credentials);
    }
  } catch (err) {
    console.error("Google token refresh failed", err);
  }

  return oauth2;
}

type ImportResult = { created: number; updated: number; skipped: number };

/**
 * Import "special day" events into a family.
 * First run: full scan (timeMin/timeMax). Subsequent runs: incremental via syncToken.
 */
export async function importGoogleSpecialDays(params: {
  userId: string;
  familyId: string;
  calendarId?: string; // default "primary"
  migrateAll?: boolean; // if true, import non-all-day & non-keyword events as well
}): Promise<ImportResult> {
  const { userId, familyId } = params;
  const calendarId = params.calendarId ?? "primary";
  const migrateAll = params.migrateAll ?? false;

  const oauth2 = await getGoogleClientForUser(userId);
  if (!oauth2) throw new Error("Google account not connected");

  const calendarClient = google.calendar({ version: "v3", auth: oauth2 });

  // Only select the fields we need to keep TS narrow
  const family = await db.family.findUnique({
    where: { id: familyId },
    select: { id: true, googleSyncToken: true },
  });

  // FULL SCAN args (allowed filters)
  const fullArgs: calendar_v3.Params$Resource$Events$List = {
    calendarId,
    maxResults: 2500,
    singleEvents: true,
    showDeleted: false,
    timeMin: new Date().toISOString(),
    timeMax: addMonths(new Date(), 18).toISOString(),
  };

  // INCREMENTAL args (ONLY syncToken + basic params)
  const incrementalArgs: calendar_v3.Params$Resource$Events$List | null =
    family?.googleSyncToken
      ? {
          calendarId,
          maxResults: 2500,
          syncToken: family.googleSyncToken,
        }
      : null;

  // Runs one pass over the API using given args, handling pagination.
  const runList = async (
    args: calendar_v3.Params$Resource$Events$List
  ): Promise<{
    created: number;
    updated: number;
    skipped: number;
    nextSyncToken?: string;
  }> => {
    let pageToken: string | undefined;
    let created = 0,
      updated = 0,
      skipped = 0;
    let nextSyncToken: string | undefined;

    do {
      const res = await calendarClient.events.list({ ...args, pageToken });
      pageToken = res.data.nextPageToken ?? undefined;
      if (res.data.nextSyncToken) nextSyncToken = res.data.nextSyncToken;

      const items = res.data.items ?? [];
      for (const ev of items) {
        const title = (ev.summary ?? "").trim();
        const isAllDay = !!ev.start?.date;
        const looksSpecial =
          /birthday|bday|anniversary|wedding|born/i.test(title) ||
          ev.eventType === "birthday";

        // If migrateAll is false, keep original behavior: only all-day or obvious keywords
        if (!migrateAll) {
          if (!isAllDay && !looksSpecial) {
            skipped++;
            continue;
          }
        } else {
          // When migrating all events, ignore the keyword filter; but still skip events without a start or id
          // (we'll accept timed events too)
          // no-op here
        }
        if (!ev.id || !ev.start) {
          skipped++;
          continue;
        }

        const dateStr = ev.start.date ?? ev.start.dateTime;
        if (!dateStr) {
          skipped++;
          continue;
        }

        const when = new Date(dateStr);
        const kind = /anniversary|wedding/i.test(title)
          ? "anniversary"
          : /birthday|bday|born/i.test(title)
          ? "birthday"
          : "other";

        const person =
          title
            .replace(/’s|s’|'s/gi, "")
            .replace(/birthday|anniversary|wedding|bday/gi, "")
            .trim() || null;

        // Upsert by (familyId, externalId, calendarId)
        const existing = await db.specialDay
          .findUnique({
            where: {
              familyId_externalId_calendarId: {
                familyId,
                externalId: ev.id!,
                calendarId,
              },
            },
          })
          .catch(() => null);

        if (!existing) {
          await db.specialDay.create({
            data: {
              familyId,
              title: title || kind,
              type: kind,
              date: when,
              person: person ?? undefined,
              notes: ev.description ?? undefined,
              source: "GOOGLE",
              externalId: ev.id!,
              calendarId,
            },
          });
          created++;
        } else {
          await db.specialDay.update({
            where: { id: existing.id },
            data: {
              title: title || existing.title,
              type: kind,
              date: when,
              person: person ?? existing.person ?? undefined,
              notes: ev.description ?? existing.notes ?? undefined,
            },
          });
          updated++;
        }
      }
    } while (pageToken);

    return { created, updated, skipped, nextSyncToken };
  };

  // Try incremental first if we have a sync token; otherwise do full scan.
  let created = 0,
    updated = 0,
    skipped = 0;

  try {
    const first = await runList(incrementalArgs ?? fullArgs);
    created += first.created;
    updated += first.updated;
    skipped += first.skipped;

    if (first.nextSyncToken) {
      await db.family.update({
        where: { id: familyId },
        data: {
          googleSyncToken: first.nextSyncToken,
          googleCalendarId: calendarId,
        },
      });
    }
  } catch (err: any) {
    // 410 Gone -> sync token is invalid/expired; clear and run a full scan once.
    const code =
      err?.code || err?.response?.status || err?.response?.data?.error?.code;
    if (code === 410 && incrementalArgs?.syncToken) {
      await db.family.update({
        where: { id: familyId },
        data: { googleSyncToken: null },
      });
      const second = await runList(fullArgs);
      created += second.created;
      updated += second.updated;
      skipped += second.skipped;

      if (second.nextSyncToken) {
        await db.family.update({
          where: { id: familyId },
          data: {
            googleSyncToken: second.nextSyncToken,
            googleCalendarId: calendarId,
          },
        });
      }
    } else {
      console.error("Google Calendar import failed:", err?.message || err);
      throw err;
    }
  }

  return { created, updated, skipped };
}
