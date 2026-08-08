import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";

/**
 * Cookie e sessão compartilhados entre Portal, Dona Lu e AllAtiva.
 * Mesmo AUTH_SECRET + path "/" = SSO no mesmo domínio (multi-zone).
 */
export const sharedCookieOptions = {
  sessionToken: {
    name:
      process.env.NODE_ENV === "production"
        ? "__Secure-authjs.session-token"
        : "authjs.session-token",
    options: {
      httpOnly: true,
      sameSite: "lax" as const,
      path: "/",
      secure: process.env.NODE_ENV === "production",
    },
  },
};

/**
 * Provedor Credentials + JWT base (sem callback `authorized`).
 * Cada app acrescenta sua própria lógica de proteção de rotas.
 */
export const sharedProviders: NextAuthConfig["providers"] = [
  Credentials({
    credentials: {
      email: { label: "E-mail", type: "email" },
      password: { label: "Senha", type: "password" },
    },
    authorize: async (credentials) => {
      const rawEmail = credentials?.email as string | undefined;
      const rawPassword = credentials?.password as string | undefined;

      const adminEmail = process.env.ADMIN_EMAIL;
      const adminPassword = process.env.ADMIN_PASSWORD;

      if (!rawEmail || !rawPassword || !adminEmail || !adminPassword) {
        return null;
      }

      const email = rawEmail.trim().toLowerCase();
      const password = rawPassword.trim();

      const emailMatches = email === adminEmail.trim().toLowerCase();
      const passwordMatches = password === adminPassword.trim();

      if (emailMatches && passwordMatches) {
        return {
          id: "admin",
          name: "Administrador",
          email: adminEmail,
        };
      }

      return null;
    },
  }),
];

export const sharedAuthBase = {
  trustHost: true,
  session: {
    strategy: "jwt" as const,
  },
  cookies: sharedCookieOptions,
  providers: sharedProviders,
  pages: {
    signIn: "/login",
  },
} satisfies Omit<NextAuthConfig, "callbacks">;

/** Origem canônica do site (SSO / redirects). */
export function getPortalOrigin(): string {
  const fromEnv = process.env.NEXT_PUBLIC_PORTAL_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");

  // Deploy único na Vercel: um só domínio, sem “vários portais”.
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    const host = vercel.replace(/^https?:\/\//, "");
    return `https://${host}`;
  }

  return "http://localhost:3000";
}

export function portalOriginFromHeaders(input: {
  host: string | null;
  forwardedHost: string | null;
  forwardedProto: string | null;
}): string {
  const fromEnv = process.env.NEXT_PUBLIC_PORTAL_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    const host = vercel.replace(/^https?:\/\//, "");
    return `https://${host}`;
  }

  const host = input.forwardedHost ?? input.host ?? "localhost:3000";
  const proto = input.forwardedProto ?? "http";
  return `${proto}://${host}`;
}

export function portalLoginUrl(origin?: string): string {
  return `${(origin ?? getPortalOrigin()).replace(/\/$/, "")}/login`;
}

export function portalHubUrl(origin?: string): string {
  return `${(origin ?? getPortalOrigin()).replace(/\/$/, "")}/hub`;
}

export { syncVercelPostgresEnv } from "./sync-vercel-postgres-env";
