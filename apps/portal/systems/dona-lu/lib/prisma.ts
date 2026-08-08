import { PrismaClient } from "../generated/client";

const globalForPrisma = globalThis as unknown as {
  donaLuPrisma: PrismaClient | undefined;
};

function createClient() {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL não configurada. Defina a connection string do Sistema de Confeitaria nas Environment Variables da Vercel."
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
