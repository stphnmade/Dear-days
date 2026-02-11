import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { getPrimaryFamilyId } from "@/lib/family";
import {
  derivePerson,
  inferSpecialType,
  parseIcal,
  stableIcalExternalId,
} from "@/lib/ical";

type ImportBody = {
  text?: string;
  url?: string;
  importAll?: boolean;
  familyId?: string;
};

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  let body: ImportBody = {};
  try {
    body = (await req.json()) as ImportBody;
  } catch {
    return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
  }

  const requestedFamilyId = body.familyId?.trim();
  const fallbackFamilyId = await getPrimaryFamilyId(userId);
  const effectiveFamilyId = requestedFamilyId || fallbackFamilyId;
  if (!effectiveFamilyId) {
    return NextResponse.json(
      { error: "No group selected for iCal import" },
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
      { error: "You do not have access to the selected group" },
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
  const familyId = family.id;

  let icsText = (body.text ?? "").trim();
  const importAll = Boolean(body.importAll);

  if (!icsText && body.url) {
    try {
      const response = await fetch(body.url, {
        redirect: "follow",
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) {
        return NextResponse.json(
          { error: `Failed to fetch iCal URL (${response.status})` },
          { status: 400 }
        );
      }
      icsText = await response.text();
    } catch (error: any) {
      return NextResponse.json(
        { error: error?.message ?? "Unable to fetch iCal URL" },
        { status: 400 }
      );
    }
  }

  if (!icsText) {
    return NextResponse.json(
      { error: "Provide either raw iCal text or a URL" },
      { status: 400 }
    );
  }

  const parsed = parseIcal(icsText);
  if (!parsed.length) {
    return NextResponse.json(
      { error: "No importable VEVENT entries found in iCal data" },
      { status: 400 }
    );
  }

  const stats = {
    total: parsed.length,
    created: 0,
    updated: 0,
    skipped: 0,
  };

  for (const event of parsed) {
    if (!importAll && !event.looksSpecial && !event.recurringYearly) {
      stats.skipped++;
      continue;
    }

    const externalId = stableIcalExternalId(event);
    const existing = await db.specialDay.findUnique({
      where: {
        familyId_externalId_calendarId: {
          familyId,
          externalId,
          calendarId: "ical-import",
        },
      },
      select: { id: true },
    });

    const data = {
      familyId,
      userId,
      title: event.summary || "Imported event",
      type: inferSpecialType(event.summary),
      date: event.date,
      person: derivePerson(event.summary) ?? undefined,
      notes: event.description
        ? `${event.description}\n\nImported from iCal`
        : "Imported from iCal",
      source: "MANUAL" as const,
      externalId,
      calendarId: "ical-import",
    };

    if (existing) {
      await db.specialDay.update({
        where: { id: existing.id },
        data,
      });
      stats.updated++;
    } else {
      await db.specialDay.create({ data });
      stats.created++;
    }
  }

  return NextResponse.json({ ok: true, result: stats });
}
