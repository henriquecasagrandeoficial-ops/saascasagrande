import { PrismaClient } from "../generated/client";

const globalForPrisma = globalThis as unknown as {
  donaLuPrisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.donaLuPrisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.donaLuPrisma = prisma;
}
