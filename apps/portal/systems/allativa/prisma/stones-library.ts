import type { Prisma, PrismaClient } from "@allativa/generated/client";

const ZIRCONIA_MATERIAL = "Zircônia";

const ZIRCONIA_SIZES_MM = [2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

const ZIRCONIA_CUTS = [
  "Redonda",
  "Oval",
  "Gota",
  "Estrela",
  "Carré",
] as const;

const ZIRCONIA_COLORS = [
  "Branco",
  "Amarelo",
  "Água marinho",
  "Vermelho",
  "Roxo",
  "Safira azul",
  "Preto",
  "Laranja",
  "Rosa",
  "Verde",
] as const;

export type SeedStonesResult =
  | { status: "blocked"; existingCount: number }
  | { status: "seeded"; insertedCount: number };

/**
 * Gera em memória todas as combinações (9 × 5 × 10 = 450 registros).
 * Nunca acessa o banco — só monta o array tipado para createMany.
 */
export function buildZirconiaMatrix(): Prisma.StoneCreateManyInput[] {
  return ZIRCONIA_SIZES_MM.flatMap((sizeMm) =>
    ZIRCONIA_CUTS.flatMap((cut) =>
      ZIRCONIA_COLORS.map((color) => ({
        name: `${ZIRCONIA_MATERIAL} · ${cut} · ${color} · ${sizeMm} mm`,
        cut,
        color,
        sizeMm,
        weightCt: 0,
        unitPrice: 0,
      }))
    )
  );
}

/**
 * Popula a tabela Stone UMA ÚNICA VEZ.
 * Trava absoluta: se já existir qualquer pedra, interrompe sem inserir nada.
 */
export async function seedStonesLibrary(
  prisma: PrismaClient
): Promise<SeedStonesResult> {
  // 1) TRAVA — primeira linha lógica. Qualquer pedra existente = bloqueio total.
  const existingCount = await prisma.stone.count();
  if (existingCount > 0) {
    console.log(
      `⛔ Cadastro de pedras ignorado (bloqueado): já existem ${existingCount} pedra(s) cadastrada(s). Nenhuma inserção será feita.`
    );
    return { status: "blocked", existingCount };
  }

  // 2) Matriz em memória
  const data = buildZirconiaMatrix();
  console.log(
    `💎 Inserindo biblioteca inicial de zircônias (${data.length} combinações) via createMany…`
  );

  // 3) Bulk insert — uma única requisição (proibido loop com .create)
  const result = await prisma.stone.createMany({ data });
  console.log(`✅ ${result.count} pedras inseridas com sucesso.`);
  return { status: "seeded", insertedCount: result.count };
}
