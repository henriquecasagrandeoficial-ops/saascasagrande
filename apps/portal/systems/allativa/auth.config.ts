import type { NextAuthConfig } from "next-auth";

import {
  portalHubUrl,
  portalLoginUrl,
  sharedAuthBase,
} from "@casagrande/auth";

/**
 * Auth do Sistema B (AllAtiva).
 * Sessão SSO via cookie compartilhado; login só no portal.
 */
export const authConfig = {
  ...sharedAuthBase,
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const path = nextUrl.pathname;
      const isOnLogin = path === "/allativa/painel/login";
      const isOnAdmin = path.startsWith("/allativa/painel");

      if (isOnLogin) {
        if (isLoggedIn) {
          return Response.redirect(new URL(portalHubUrl()));
        }
        return Response.redirect(new URL(portalLoginUrl()));
      }

      if (isOnAdmin) {
        if (!isLoggedIn) {
          return Response.redirect(new URL(portalLoginUrl()));
        }
        return true;
      }

      return true;
    },
  },
} satisfies NextAuthConfig;
