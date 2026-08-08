/**
 * Alinha nomes de env do Vercel Postgres com o que cada Prisma schema espera.
 * Vercel injeta: POSTGRES_PRISMA_URL, POSTGRES_URL_NON_POOLING, (às vezes DATABASE_URL).
 * Confeitaria usa DATABASE_URL; Joias usa POSTGRES_PRISMA_URL.
 */
export function syncVercelPostgresEnv() {
  if (!process.env.DATABASE_URL && process.env.POSTGRES_PRISMA_URL) {
    process.env.DATABASE_URL = process.env.POSTGRES_PRISMA_URL;
  }
  if (!process.env.DIRECT_URL && process.env.POSTGRES_URL_NON_POOLING) {
    process.env.DIRECT_URL = process.env.POSTGRES_URL_NON_POOLING;
  }
  if (!process.env.DIRECT_URL && process.env.DATABASE_URL) {
    process.env.DIRECT_URL = process.env.DATABASE_URL;
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
