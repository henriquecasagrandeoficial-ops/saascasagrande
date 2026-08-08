/**
 * Seed isolado da biblioteca de Zircônias.
 * Uso: npm run db:seed:stones
 *
 * Trava absoluta: se já existir qualquer pedra, NÃO insere nada.
 */
import { PrismaClient } from "@allativa/generated/client";

import { seedStonesLibrary } from "./stones-library";

const prisma = new PrismaClient();

async function main(): Promise<void> {
  await seedStonesLibrary(prisma);
}

main()
  .catch((error) => {
    console.error("❌ Erro ao executar o seed de pedras:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
