import { syncVercelPostgresEnv } from "@casagrande/auth";
import { PrismaClient } from "../generated/client";

const globalForPrisma = globalThis as unknown as {
  donaLuPrisma: PrismaClient | undefined;
};

function createClient() {
  syncVercelPostgresEnv();
  if (!process.env.DATABASE_URL) {
    throw new Error(
      "Banco da Confeitaria não encontrado. Na Vercel, conecte o Postgres (Storage) ao projeto ou defina DATABASE_URL / POSTGRES_PRISMA_URL."
    );
  }
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

/** Lazy: evita instanciar Prisma no `next build` (sem env de banco). */
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const client = (globalForPrisma.donaLuPrisma ??= createClient());
    const value = Reflect.get(client, prop, receiver);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
