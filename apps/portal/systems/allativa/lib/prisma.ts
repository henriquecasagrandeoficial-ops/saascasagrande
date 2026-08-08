import { PrismaClient } from "../generated/client";

const globalForPrisma = globalThis as unknown as {
  allativaPrisma: PrismaClient | undefined;
};

function createClient() {
  if (!process.env.POSTGRES_PRISMA_URL && !process.env.DATABASE_URL) {
    throw new Error(
      "POSTGRES_PRISMA_URL não configurada. Defina a connection string do Sistema de Joias nas Environment Variables da Vercel."
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
