import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { importGoogleSpecialDays } from "@/lib/google";
import { getPrimaryFamilyId } from "@/lib/family";
import { normalizeCalendarScopes } from "@/lib/connections";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  // Check google account
  const google = await db.account.findFirst({
    where: { userId, provider: "google" },
  });
  if (!google) {
    return NextResponse.json(
      { error: "Google account not connected" },
      { status: 400 }
    );
  }

  try {
    // read body to allow options (migrateAll, calendarId/calendarIds, dryRun, toggles)
    let body: any = {};
    try {
      body = (await req.json()) ?? {};
    } catch {
      body = {};
    }

    const migrateAll = Boolean(body.migrateAll);
    const dryRun = Boolean(body.dryRun);
    const requestedFamilyId = String(body.familyId ?? "").trim();
    const fallbackFamilyId = await getPrimaryFamilyId(userId);
    const effectiveFamilyId = requestedFamilyId || fallbackFamilyId;
    if (!effectiveFamilyId) {
      return NextResponse.json(
        { error: "No group selected for Google import" },
        { status: 400 }
      );
    }

    let family: { id: string; ownerId: string; allowMemberPosting: boolean } | null =
      null;
    try {
      family = await db.family.findFirst({
        where: {
          id: effectiveFamilyId,
          OR: [{ ownerId: userId }, { members: { some: { joinedUserId: userId } } }],
        },
        select: { id: true, ownerId: true, allowMemberPosting: true },
      });
    } catch (error: any) {
      const msg = String(error?.message ?? "");
      if (!msg.includes("allowMemberPosting")) throw error;
      const legacyFamily = await db.family.findFirst({
        where: {
          id: effectiveFamilyId,
          OR: [{ ownerId: userId }, { members: { some: { joinedUserId: userId } } }],
        },
        select: { id: true, ownerId: true },
      });
      family = legacyFamily
        ? { ...legacyFamily, allowMemberPosting: true }
        : null;
    }
    if (!family) {
      return NextResponse.json(
        { error: "You do not have access to this group" },
        { status: 403 }
      );
    }
    const isOwner = family.ownerId === userId;
    if (!isOwner && !family.allowMemberPosting) {
      return NextResponse.json(
        { error: "Only owners can import dates for this group" },
        { status: 403 }
      );
    }

    const userPrefs = await db.user.findUnique({
      where: { id: userId },
      select: {
        syncPaused: true,
        syncBirthdays: true,
        syncGroupMeetings: true,
        syncReminders: true,
        googlePullEnabled: true,
        googleCalendarScopes: true,
      },
    });
    if (!userPrefs) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    if (userPrefs.syncPaused) {
      return NextResponse.json(
        { error: "All syncing is currently paused." },
        { status: 409 }
      );
    }
    if (!userPrefs.googlePullEnabled) {
      return NextResponse.json(
        { error: "Pull from Google is disabled in your connection settings." },
        { status: 409 }
      );
    }

    const selectedFromBody = Array.isArray(body.calendarIds)
      ? body.calendarIds.filter((x: unknown): x is string => typeof x === "string")
      : [];
    const selectedFromPrefs = normalizeCalendarScopes(userPrefs.googleCalendarScopes);
    const calendarIds =
      selectedFromBody.length > 0
        ? selectedFromBody
        : selectedFromPrefs.length > 0
        ? selectedFromPrefs
        : [typeof body.calendarId === "string" ? body.calendarId : "primary"];

    const syncBirthdays =
      typeof body.syncBirthdays === "boolean"
        ? body.syncBirthdays
        : userPrefs.syncBirthdays;
    const syncGroupMeetings =
      typeof body.syncGroupMeetings === "boolean"
        ? body.syncGroupMeetings
        : userPrefs.syncGroupMeetings;
    const syncReminders =
      typeof body.syncReminders === "boolean"
        ? body.syncReminders
        : userPrefs.syncReminders;

    const result = await importGoogleSpecialDays({
      userId,
      familyId: family.id,
      calendarIds,
      migrateAll,
      dryRun,
      syncBirthdays,
      syncGroupMeetings,
      syncReminders,
    });

    if (!dryRun) {
      await db.user.update({
        where: { id: userId },
        data: { lastGlobalRefreshAt: new Date() },
      });
    }

    return NextResponse.json({ ok: true, result });
  } catch (err: any) {
    console.error("Import failed (API):", err);
    const msg = err?.message ?? String(err);
    // If token is invalid (revoked/expired), clear stored tokens so user can re-auth.
    if (
      typeof msg === "string" &&
      msg.toLowerCase().includes("invalid_grant")
    ) {
      try {
        await db.account.updateMany({
          where: { userId, provider: "google" },
          data: { access_token: null, refresh_token: null, expires_at: null },
        });
      } catch (e) {
        console.error("Failed to clear google tokens:", e);
      }
      return NextResponse.json(
        {
          error:
            "invalid_grant: refresh token invalid or revoked. Please reconnect Google.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
