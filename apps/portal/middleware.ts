import NextAuth from "next-auth";

import { authConfig } from "@/auth.config";

export const { auth: middleware } = NextAuth(authConfig);

export const config = {
  matcher: [
    "/",
    "/login",
    "/hub",
    "/hub/:path*",
    "/dona-lu/painel",
    "/dona-lu/painel/:path*",
    "/allativa/painel",
    "/allativa/painel/:path*",
  ],
};
