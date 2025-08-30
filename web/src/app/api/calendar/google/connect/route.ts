import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { PrismaClient } from "@prisma/client";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email)
    return new Response("Unauthorized", { status: 401 });

  // Nothing to do here yet: Auth.js already captured tokens.
  // Optionally start a watch channel (webhook) to receive changes.
  return new Response(JSON.stringify({ connected: true }), { status: 200 });
}
