// src/lib/auth.ts
import type { NextAuthOptions, DefaultSession } from "next-auth";
import { getServerSession } from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/db";

// (Optional) Add `id` to the session's user type
declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & { id: string };
  }
}

const isDev = process.env.NODE_ENV !== "production";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: isDev, // dev convenience
      authorization: {
        params: {
          scope: process.env.GOOGLE_OAUTH_SCOPES!,
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  ],
  callbacks: {
    async session({ session, token }) {
      // expose user id on the client
      if (token?.sub) (session.user as any).id = token.sub;
      return session;
    },
  },
};

// Convenience wrapper so you don't repeat options everywhere
export function getAuthSession() {
  return getServerSession(authOptions);
}
