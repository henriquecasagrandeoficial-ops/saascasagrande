import type { NextAuthConfig } from "next-auth";

import {
  portalHubUrl,
  portalLoginUrl,
  sharedAuthBase,
} from "@casagrande/auth";

export const authConfig = {
  ...sharedAuthBase,
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const path = nextUrl.pathname;
      const origin = nextUrl.origin;

      const isLogin = path === "/login";
      const isHub = path === "/hub" || path.startsWith("/hub/");
      const isDonaPainel =
        path === "/dona-lu/painel" || path.startsWith("/dona-lu/painel/");
      const isAllativaPainel =
        path === "/allativa/painel" || path.startsWith("/allativa/painel/");
      const isSystemLogin =
        path === "/dona-lu/painel/login" || path === "/allativa/painel/login";

      if (isLogin) {
        if (isLoggedIn) {
          return Response.redirect(new URL(portalHubUrl(origin)));
        }
        return true;
      }

      if (isSystemLogin) {
        return Response.redirect(
          new URL(isLoggedIn ? portalHubUrl(origin) : portalLoginUrl(origin))
        );
      }

      if (isHub || isDonaPainel || isAllativaPainel) {
        if (!isLoggedIn) {
          return Response.redirect(new URL(portalLoginUrl(origin)));
        }
        return true;
      }

      return true;
    },
  },
} satisfies NextAuthConfig;
