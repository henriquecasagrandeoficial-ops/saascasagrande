import { PrismaClient } from "../generated/client";

const globalForPrisma = globalThis as unknown as {
  allativaPrisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.allativaPrisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.allativaPrisma = prisma;
}
