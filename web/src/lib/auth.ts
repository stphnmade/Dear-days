// src/lib/auth.ts
import type { NextAuthOptions, DefaultSession } from "next-auth";
import { getServerSession } from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

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
    Credentials({
      name: "Email & Password",
      credentials: {
        email: {
          label: "Email",
          type: "email",
          placeholder: "you@example.com",
        },
        password: { label: "Password", type: "password" },
      },
      async authorize(
        credentials
      ): Promise<{ id: string; email: string; name: string | null } | null> {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required");
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          select: {
            id: true,
            email: true,
            name: true,
            password: true, // Explicitly select password field
          } as any,
        });

        console.log(
          "[AUTH] User found:",
          user?.email,
          "Has password field:",
          !!(user as any)?.password
        );

        // password field exists in schema but TS might not recognize it
        if (!user || !(user as any).password) {
          throw new Error("Invalid email or password");
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          (user as any).password
        );

        console.log("[AUTH] Password valid:", isPasswordValid);

        if (!isPasswordValid) {
          throw new Error("Invalid email or password");
        }

        return {
          id: (user as any).id,
          email: (user as any).email,
          name: (user as any).name,
        };
      },
    }),
  ],
  callbacks: {
    async session({ session, user, token }) {
      // prefer user.id if using PrismaAdapter, otherwise token.sub for JWT sessions
      if (user?.id) (session.user as any).id = user.id;
      else if (token?.sub) (session.user as any).id = token.sub;
      return session;
    },
  },
};

// Convenience wrapper so you don't repeat options everywhere
export function getAuthSession() {
  return getServerSession(authOptions);
}
