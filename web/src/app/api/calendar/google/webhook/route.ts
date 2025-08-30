import { headers } from "next/headers";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Google posts notifications with X-Goog-* headers
export async function POST(req: Request) {
  const h = headers();
  const channelId = (await h).get("X-Goog-Channel-ID") || "";
  const resourceId = (await h).get("X-Goog-Resource-ID") || "";

  // Find matching account by channelId/resourceId and enqueue a sync job
  const acct = await prisma.account.findFirst({
    where: { channelId, resourceId },
  });
  if (acct) {
    // enqueue sync job (QStash/Redis/cron)—for now, do in-process fire-and-forget
    // await enqueueSync(acct.userId, "google");
  }
  return new Response("ok");
}
