// src/lib/google.ts
import { google } from "googleapis";
import { addMonths, isAfter } from "date-fns";
import { db } from "@/lib/db"; // make sure you export a Prisma client from here

/**
 * Returns an OAuth2 client for the user's Google account.
 * Uses your NextAuth Account row for tokens and refreshes if needed.
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

  // silently refresh if expired
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
      // set refreshed creds on client
      oauth2.setCredentials(credentials);
    }
  } catch (err) {
    console.error("Google token refresh failed", err);
  }

  return oauth2;
}

type ImportResult = { created: number; updated: number; skipped: number };

/**
 * Imports "special days" from Google Calendar into the given family.
 * - Full scan for the next 18 months on first run
 * - Then incremental with syncToken
 * - Heuristic filters for birthdays/anniversaries/all-day events
 */
export async function importGoogleSpecialDays(params: {
  userId: string;
  familyId: string;
  calendarId?: string;
}): Promise<ImportResult> {
  const { userId, familyId } = params;
  const calendarId = params.calendarId ?? "primary";

  const oauth2 = await getGoogleClientForUser(userId);
  if (!oauth2) throw new Error("Google account not connected");

  const calendar = google.calendar({ version: "v3", auth: oauth2 });
  const family = await db.family.findUnique({
    where: { id: familyId },
    select: { id: true, googleSyncToken: true }, // safer select
  });

  const listArgs: any = {
    calendarId,
    singleEvents: true,
    showDeleted: false,
    maxResults: 2500,
  };

  if (!family?.googleSyncToken) {
    listArgs.timeMin = new Date().toISOString();
    listArgs.timeMax = addMonths(new Date(), 18).toISOString();
  } else {
    listArgs.syncToken = family.googleSyncToken;
  }

  let pageToken: string | undefined;
  let nextSyncToken: string | undefined;
  let created = 0,
    updated = 0,
    skipped = 0;

  // loop through pages of events
  do {
    const res = await calendar.events.list({ ...listArgs, pageToken });
    pageToken = res.data.nextPageToken ?? undefined;
    if (res.data.nextSyncToken) nextSyncToken = res.data.nextSyncToken;

    const items = res.data.items ?? [];
    // … handle items …
  } while (pageToken);

  // ✅ place this block right here, after loop finishes
  if (nextSyncToken) {
    await db.family.update({
      where: { id: familyId },
      data: { googleSyncToken: nextSyncToken, googleCalendarId: calendarId },
    });
  }

  return { created, updated, skipped };
}
