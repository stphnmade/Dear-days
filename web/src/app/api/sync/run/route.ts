import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { PrismaClient } from "@prisma/client";
import { google } from "googleapis";
import { DateTime } from "luxon";

const prisma = new PrismaClient();

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email)
    return new Response("Unauthorized", { status: 401 });

  const user = await prisma.user.findUnique({
    where: { email: session.user.email! },
    include: { accounts: true, families: { include: { family: true } } },
  });
  if (!user) return new Response("No user", { status: 404 });

  const googleAcct = user.accounts.find((a) => a.provider === "google");
  if (googleAcct?.access_token) {
    const auth = new google.auth.OAuth2();
    auth.setCredentials({
      access_token: googleAcct.access_token,
      refresh_token: googleAcct.refresh_token ?? undefined,
    });
    const cal = google.calendar({ version: "v3", auth });
    const now = new Date().toISOString();
    const res = await cal.events.list({
      calendarId: "primary",
      timeMin: now, // start with upcoming; broaden later
      maxResults: 200,
      singleEvents: true,
      orderBy: "startTime",
    });

    const familyId = user.families[0]?.familyId; // default for now
    if (familyId) {
      const toSave = (res.data.items ?? [])
        .filter((e) => isSpecialDay(e)) // simple heuristic
        .map((e) => ({
          familyId,
          userId: user.id,
          title: e.summary ?? "Untitled",
          date: new Date(normalizeDate(e)),
          type: "custom",
          source: "google",
          sourceId: e.id ?? undefined,
        }));
      for (const d of toSave) {
        await prisma.specialDay.upsert({
          where: { sourceId: d.sourceId! },
          update: d,
          create: d,
        });
      }
    }
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200 });
}

function isSpecialDay(e: any) {
  const summary = (e.summary ?? "").toLowerCase();
  return ["birthday", "anniversary"].some((k) => summary.includes(k));
}
function normalizeDate(e: any) {
  const s = e.start?.date || e.start?.dateTime || new Date().toISOString();
  return s.substring(0, 10) + "T00:00:00.000Z";
}
