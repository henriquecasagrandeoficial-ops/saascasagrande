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
  // Garante engines Prisma (custom output) no bundle serverless da Vercel.
  outputFileTracingIncludes: {
    "/*": [
      "./systems/dona-lu/generated/**/*",
      "./systems/allativa/generated/**/*",
      "./systems/dona-lu/prisma/**/*",
      "./systems/allativa/prisma/**/*",
    ],
  },
  serverExternalPackages: ["@prisma/client", "prisma"],
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@dona-lu": path.join(__dirname, "systems/dona-lu"),
      "@allativa": path.join(__dirname, "systems/allativa"),
    };
    return config;
  },
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
