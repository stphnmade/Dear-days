import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { importGoogleSpecialDays } from "@/lib/google";

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

  const family = await db.family.findFirst({ where: { ownerId: userId } });
  if (!family) {
    return NextResponse.json(
      { error: "No family found for user" },
      { status: 400 }
    );
  }

  try {
    // read body to allow options (migrateAll, calendarId)
    let body: any = {};
    try {
      body = (await req.json()) ?? {};
    } catch (e) {
      body = {};
    }

    const migrateAll = Boolean(body.migrateAll);
    const calendarId = body.calendarId ?? "primary";

    const result = await importGoogleSpecialDays({
      userId,
      familyId: family.id,
      calendarId,
      migrateAll,
    });
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
