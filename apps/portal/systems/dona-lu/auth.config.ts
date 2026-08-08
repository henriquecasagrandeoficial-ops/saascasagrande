import type { NextAuthConfig } from "next-auth";

import {
  portalHubUrl,
  portalLoginUrl,
  sharedAuthBase,
} from "@casagrande/auth";

/**
 * Auth do Sistema A (Dona Lu).
 * Sessão SSO via cookie compartilhado; login só no portal.
 */
export const authConfig = {
  ...sharedAuthBase,
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const path = nextUrl.pathname;
      // Com basePath, o middleware vê o path sem o prefixo /dona-lu.
      const isOnLogin = path === "/dona-lu/painel/login";
      const isOnAdmin = path.startsWith("/dona-lu/painel");

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
