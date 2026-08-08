import { syncVercelPostgresEnv } from "@casagrande/auth";
import { PrismaClient } from "../generated/client";

syncVercelPostgresEnv();

const globalForPrisma = globalThis as unknown as {
  allativaPrisma: PrismaClient | undefined;
};

function createClient() {
  if (!process.env.POSTGRES_PRISMA_URL) {
    throw new Error(
      "Banco de Joias não encontrado. Na Vercel, conecte o Postgres (Storage) ao projeto ou defina POSTGRES_PRISMA_URL / DATABASE_URL."
    );
  }
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

export const prisma = globalForPrisma.allativaPrisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.allativaPrisma = prisma;
}
