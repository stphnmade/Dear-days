import { NextAuthOptions } from "next-auth";
import Google from "next-auth/providers/google";

const isDev = process.env.NODE_ENV !== "production";

export const authOptions: NextAuthOptions = {
  // ...
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: isDev, // ✅ dev convenience
      authorization: {
        params: {
          scope: process.env.GOOGLE_OAUTH_SCOPES!,
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  ],
};
