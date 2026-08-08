import fs from "fs";
import path from "path";
import { createRequire } from "module";

/**
 * Os apps Next vivem em `apps/*`, mas os arquivos `.env*` do monorepo ficam na
 * raiz. Sem carregar a raiz explicitamente, variaveis como `AUTH_SECRET`,
 * `DATABASE_URL` e `POSTGRES_PRISMA_URL` nao chegam ao runtime e o Auth.js
 * quebra com `MissingSecret` enquanto o Prisma falha na inicializacao.
 *
 * Na Vercel as variaveis ja vem do ambiente, portanto esta funcao apenas
 * complementa o que estiver faltando e nunca sobrescreve valores existentes.
 *
 * @param {string} appDir diretorio do app (normalmente `__dirname` do next.config)
 */
export function loadRootEnv(appDir) {
  const rootDir = path.join(appDir, "..", "..");

  // `@next/env` acompanha o Next e resolve `.env`, `.env.local`,
  // `.env.<NODE_ENV>` e `.env.<NODE_ENV>.local` na ordem correta,
  // incluindo expansao de variaveis. E CJS, por isso o require.
  const require = createRequire(import.meta.url);
  const { loadEnvConfig } = require("@next/env");
  const isDev = process.env.NODE_ENV !== "production";

  loadEnvConfig(rootDir, isDev);

  // `loadEnvConfig` popula apenas este processo. O `next dev`/`next build`
  // repassa `process.env` para os processos filhos, mas para garantir que os
  // arquivos da raiz sejam vistos tambem por ferramentas que leem `.env`
  // diretamente do diretorio do app (ex.: Prisma CLI), espelhamos os arquivos
  // como links quando eles existirem na raiz e faltarem no app.
  const envFiles = [
    ".env",
    ".env.local",
    ".env.development",
    ".env.development.local",
    ".env.production",
    ".env.production.local",
  ];

  for (const file of envFiles) {
    const source = path.join(rootDir, file);
    const target = path.join(appDir, file);

    if (!fs.existsSync(source) || fs.existsSync(target)) continue;

    try {
      fs.symlinkSync(path.relative(appDir, source), target);
    } catch {
      // Filesystem somente leitura (ex.: build na Vercel) — as variaveis
      // ja vem do ambiente nesse cenario, entao ignorar e seguro.
    }
  }

  // Vercel Postgres → aliases DATABASE_URL / POSTGRES_* (build-time).
  if (!process.env.DATABASE_URL && process.env.POSTGRES_PRISMA_URL) {
    process.env.DATABASE_URL = process.env.POSTGRES_PRISMA_URL;
  }
  if (!process.env.DIRECT_URL && process.env.POSTGRES_URL_NON_POOLING) {
    process.env.DIRECT_URL = process.env.POSTGRES_URL_NON_POOLING;
  }
  if (!process.env.POSTGRES_PRISMA_URL && process.env.DATABASE_URL) {
    process.env.POSTGRES_PRISMA_URL = process.env.DATABASE_URL;
  }
  if (
    !process.env.POSTGRES_URL_NON_POOLING &&
    (process.env.DIRECT_URL || process.env.DATABASE_URL)
  ) {
    process.env.POSTGRES_URL_NON_POOLING =
      process.env.DIRECT_URL || process.env.DATABASE_URL;
  }
}
