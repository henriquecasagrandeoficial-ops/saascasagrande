import { syncVercelPostgresEnv } from "@casagrande/auth";
import { PrismaClient } from "../generated/client";

syncVercelPostgresEnv();

const globalForPrisma = globalThis as unknown as {
  donaLuPrisma: PrismaClient | undefined;
};

function createClient() {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      "Banco da Confeitaria não encontrado. Na Vercel, conecte o Postgres (Storage) ao projeto ou defina DATABASE_URL / POSTGRES_PRISMA_URL."
    );
  }
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

export const prisma = globalForPrisma.donaLuPrisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.donaLuPrisma = prisma;
}
