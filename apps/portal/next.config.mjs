/** @type {import('next').NextConfig} */
import path from "path";
import { fileURLToPath } from "url";
import { loadRootEnv } from "../../packages/auth/src/load-root-env.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

loadRootEnv(__dirname);

/**
 * Portal unificado: Login/Hub + painéis /dona-lu/* e /allativa/*
 * no mesmo deploy (mesmo domínio). Sem rewrite para localhost.
 */
const nextConfig = {
  transpilePackages: ["@casagrande/auth"],
  outputFileTracingRoot: path.join(__dirname, "../../"),
  images: {
    localPatterns: [
      { pathname: "/api/file" },
      { pathname: "/dona-lu/api/file" },
      { pathname: "/allativa/api/file" },
    ],
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "placehold.co" },
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com" },
    ],
  },
};

export default nextConfig;
