import auth from "next-auth/middleware";
export const middleware = auth;

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/events/:path*",
    "/family/:path*",
    "/settings/:path*",
  ],
};
