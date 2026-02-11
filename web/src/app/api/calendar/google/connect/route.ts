import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { randomUUID } from "node:crypto";
import { google } from "googleapis";
import { db } from "@/lib/db";
import { getGoogleClientForUser } from "@/lib/google";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return new Response("Unauthorized", { status: 401 });

  const userId = session.user.id;
  const account = await db.account.findFirst({
    where: { userId, provider: "google" },
    select: { id: true },
  });
  if (!account) {
    return new Response(
      JSON.stringify({ connected: false, error: "Google account not connected" }),
      { status: 400 }
    );
  }

  const oauth2 = await getGoogleClientForUser(userId);
  if (!oauth2) {
    return new Response(
      JSON.stringify({ connected: false, error: "Google token unavailable" }),
      { status: 400 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const calendarId =
    typeof body?.calendarId === "string" && body.calendarId.trim()
      ? body.calendarId.trim()
      : "primary";
  const defaultAddress = process.env.NEXTAUTH_URL
    ? `${process.env.NEXTAUTH_URL.replace(/\/+$/, "")}/api/calendar/google/webhook`
    : null;
  const address = process.env.GOOGLE_WEBHOOK_ADDRESS ?? defaultAddress;
  if (!address) {
    return new Response(
      JSON.stringify({
        connected: true,
        watchEnabled: false,
        warning: "Set GOOGLE_WEBHOOK_ADDRESS or NEXTAUTH_URL to enable webhooks.",
      }),
      { status: 200 }
    );
  }

  const channelId = `deardays-${randomUUID()}`;
  const webhookSecret = randomUUID().replace(/-/g, "");
  const calendarClient = google.calendar({ version: "v3", auth: oauth2 });

  try {
    const watch = await calendarClient.events.watch({
      calendarId,
      requestBody: {
        id: channelId,
        type: "web_hook",
        address,
        token: webhookSecret,
      },
    });

    await db.account.update({
      where: { id: account.id },
      data: {
        channelId,
        resourceId: watch.data.resourceId ?? null,
        webhookSecret,
      },
    });

    return new Response(
      JSON.stringify({
        connected: true,
        watchEnabled: true,
        channelId,
        resourceId: watch.data.resourceId ?? null,
      }),
      { status: 200 }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({
        connected: true,
        watchEnabled: false,
        error: error?.message ?? "Failed to start Google watch channel",
      }),
      { status: 500 }
    );
  }
}
