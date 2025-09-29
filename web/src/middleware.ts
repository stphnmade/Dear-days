import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const PROTECTED = [
  /^\/dashboard/,
  /^\/events/,
  /^\/family/,
  /^\/settings/,
  /^\/connections/,
  /^\/invite/,
];
export async function middleware(req: NextRequest) {
  if (!PROTECTED.some((rx) => rx.test(req.nextUrl.pathname)))
    return NextResponse.next();

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return NextResponse.redirect(new URL("/", req.url));

  return NextResponse.next();
}
