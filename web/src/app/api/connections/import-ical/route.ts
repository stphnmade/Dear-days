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
  dryRun?: boolean;
  mergeMode?: "merge" | "skip";
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
  const dryRun = Boolean(body.dryRun);
  const mergeMode = body.mergeMode === "merge" ? "merge" : "skip";

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

  const candidates = parsed.filter((event) => {
    if (!importAll && !event.looksSpecial && !event.recurringYearly) return false;
    return true;
  });

  if (!candidates.length) {
    return NextResponse.json({
      ok: true,
      result: { total: parsed.length, importable: 0, created: 0, updated: 0, skipped: parsed.length, duplicates: 0 },
      preview: true,
    });
  }

  const minDate = new Date(
    Math.min(...candidates.map((c) => c.date.getTime())) - 24 * 60 * 60 * 1000
  );
  const maxDate = new Date(
    Math.max(...candidates.map((c) => c.date.getTime())) + 24 * 60 * 60 * 1000
  );

  const existingRows = await db.specialDay.findMany({
    where: {
      familyId,
      date: { gte: minDate, lte: maxDate },
    },
    select: {
      id: true,
      title: true,
      date: true,
      externalId: true,
      calendarId: true,
      notes: true,
      person: true,
      type: true,
    },
  });

  const existingByExternal = new Map<string, (typeof existingRows)[number]>();
  const existingByKey = new Map<string, (typeof existingRows)[number]>();
  for (const row of existingRows) {
    if (row.externalId && row.calendarId === "ical-import") {
      existingByExternal.set(row.externalId, row);
    }
    const key = `${(row.title ?? "").trim().toLowerCase()}|${row.date
      .toISOString()
      .slice(0, 10)}`;
    if (!existingByKey.has(key)) existingByKey.set(key, row);
  }

  const enriched = candidates.map((event) => {
    const externalId = stableIcalExternalId(event);
    const title = event.summary || "Imported event";
    const key = `${title.trim().toLowerCase()}|${event.date.toISOString().slice(0, 10)}`;
    return { event, externalId, title, key };
  });

  const duplicates = enriched.filter(
    (entry) =>
      !existingByExternal.has(entry.externalId) && existingByKey.has(entry.key)
  ).length;

  if (dryRun) {
    return NextResponse.json({
      ok: true,
      preview: true,
      result: {
        total: parsed.length,
        importable: enriched.length,
        created: 0,
        updated: 0,
        skipped: parsed.length - enriched.length,
        duplicates,
      },
    });
  }

  if (duplicates > 0 && mergeMode !== "merge") {
    return NextResponse.json(
      {
        error: `We found ${duplicates} potential duplicate event${duplicates === 1 ? "" : "s"}. Merge them?`,
        code: "DUPLICATES_FOUND",
        duplicates,
      },
      { status: 409 }
    );
  }

  const stats = {
    total: parsed.length,
    importable: enriched.length,
    created: 0,
    updated: 0,
    skipped: 0,
    duplicates,
  };

  stats.skipped = parsed.length - enriched.length;

  for (const item of enriched) {
    const mergeTarget =
      existingByExternal.get(item.externalId) ??
      (mergeMode === "merge" ? existingByKey.get(item.key) : undefined);

    const baseData = {
      familyId,
      userId,
      title: item.title,
      type: inferSpecialType(item.title),
      date: item.event.date,
      person: derivePerson(item.title) ?? undefined,
      notes: item.event.description
        ? `${item.event.description}\n\nImported from iCal`
        : "Imported from iCal",
      source: "MANUAL" as const,
    };

    if (mergeTarget) {
      await db.specialDay.update({
        where: { id: mergeTarget.id },
        data: {
          ...baseData,
          ...(mergeTarget.externalId ? {} : { externalId: item.externalId, calendarId: "ical-import" }),
        },
      });
      stats.updated++;
    } else {
      await db.specialDay.create({
        data: {
          ...baseData,
          externalId: item.externalId,
          calendarId: "ical-import",
        },
      });
      stats.created++;
    }
  }

  return NextResponse.json({ ok: true, result: stats });
}
