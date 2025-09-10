"use server";

import { randomBytes } from "crypto";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function createInvite(email?: string) {
  const s = await getServerSession(authOptions);
  if (!s?.user) throw new Error("Unauthorized");
  const inviterId = (s.user as any).id as string;

  const token = randomBytes(24).toString("base64url");
  await prisma.invitation.create({
    data: { inviterId, email: email || null, token },
  });

  return `${process.env.NEXTAUTH_URL}/invite/${token}`;
}
