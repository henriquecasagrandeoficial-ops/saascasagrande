/** @type {import('next').NextConfig} */
import path from "path";
import { fileURLToPath } from "url";
import { loadRootEnv } from "../../packages/auth/src/load-root-env.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

loadRootEnv(__dirname);

/**
 * Rewrites para os apps filhos:
 * - Só em desenvolvimento local (`next dev`): proxy → localhost:3001/3002.
 * - Na Vercel / produção: sem rewrite externo (evita DNS_HOSTNAME_RESOLVED_PRIVATE).
 *   Os links do Hub continuam relativos (`/dona-lu/painel`, `/allativa/painel`).
 */
const isLocalDev =
  process.env.VERCEL !== "1" && process.env.NODE_ENV === "development";

const nextConfig = {
  transpilePackages: ["@casagrande/auth"],
  outputFileTracingRoot: path.join(__dirname, "../../"),
  async rewrites() {
    if (!isLocalDev) {
      return [];
    }

    const dona = process.env.DONA_LU_ORIGIN?.trim() || "http://localhost:3001";
    const alla = process.env.ALLATIVA_ORIGIN?.trim() || "http://localhost:3002";

    return [
      { source: "/dona-lu", destination: `${dona}/dona-lu` },
      { source: "/dona-lu/:path*", destination: `${dona}/dona-lu/:path*` },
      { source: "/allativa", destination: `${alla}/allativa` },
      { source: "/allativa/:path*", destination: `${alla}/allativa/:path*` },
    ];
  },
};

export default nextConfig;
