"use server";

import { revalidatePath, revalidateTag } from "next/cache";

import { prisma } from "@allativa/lib/prisma";
import { requireAdmin } from "@allativa/lib/auth-guard";
import type { MaterialType, PricingMode, Unit } from "@allativa/lib/pricing";
import type { InsumoAttrs } from "@allativa/lib/material-requisition";
import {
  expandPattern,
  type ExpandablePattern,
} from "@allativa/lib/supply-pattern-expand";

export type FichaActionState = {
  error?: string;
  success?: boolean;
};

export type FichaLineKind =
  | "pedra"
  | "metal"
  | "corrente"
  | "fio"
  | "outro";

export type SaveFichaMaterial = {
  materialId?: string;
  name: string;
  type: MaterialType;
  packagePrice: number;
  packageQuantity: number;
  unit: Unit;
  quantityUsed: number;
  sequenceOrder?: number;
  lineKind?: FichaLineKind;
  sourcePatternId?: string | null;
  patternQty?: number | null;
} & InsumoAttrs;

export type SaveFichaPatternApplied = {
  patternId: string;
  /** Quantidade total de pedras (round-robin nas cores da Ordem). */
  totalStones: number;
  sequenceOrder?: number;
};

export type SaveFichaInput = {
  productId: string;
  mode: PricingMode;
  strategyValue: number;
  sellingPrice: number;
  totalCost: number;
  totalWeightG?: number | null;
  /** Linhas avulsas (já resolvidas). Ordens vêm em patternsApplied. */
  materials: SaveFichaMaterial[];
  patternsApplied?: SaveFichaPatternApplied[];
};

const PATTERN_INCLUDE = {
  items: {
    orderBy: { sequenceOrder: "asc" as const },
    include: {
      stone: true,
      alloy: true,
      chain: true,
      wire: {
        include: {
          alloy: { select: { id: true, name: true, pricePerGram: true } },
        },
      },
    },
  },
} as const;

const round2 = (value: number): number => Math.round(value * 100) / 100;

/**
 * Nome único de Material para gemas: evita que pedras com o mesmo nome comercial
 * e cores/lapidações diferentes colidam no upsert por `name` e sobrescrevam
 * o attrColor (bug que fazia todas as pedras saírem com a cor da última salva).
 */
function resolveMaterialName(line: SaveFichaMaterial): string {
  const raw = line.name.trim();
  if (line.type !== "gema") return raw;

  const root = raw.split(" · ")[0]?.trim() || raw;
  const cut = line.attrCut?.trim() || "";
  const color = line.attrColor?.trim() || "";
  const size =
    line.attrSizeMm !== null && line.attrSizeMm !== undefined
      ? `${line.attrSizeMm}mm`
      : "";

  const parts = [root, cut, color, size].filter(Boolean);
  if (parts.length === 1) return root;
  return parts.join(" · ");
}

function toSaveLine(
  leaf: ReturnType<typeof expandPattern>[number]
): SaveFichaMaterial {
  return {
    name: leaf.name,
    type: leaf.type,
    packagePrice: leaf.packagePrice,
    packageQuantity: leaf.packageQuantity,
    unit: leaf.unit,
    quantityUsed: leaf.quantityUsed,
    sequenceOrder: leaf.sequenceOrder,
    lineKind: leaf.lineKind,
    sourcePatternId: leaf.sourcePatternId,
    patternQty: leaf.patternQty,
    attrCut: leaf.attrCut,
    attrColor: leaf.attrColor,
    attrSizeMm: leaf.attrSizeMm,
    attrMaterial: leaf.attrMaterial,
    attrMesh: leaf.attrMesh,
    attrProfile: leaf.attrProfile,
    attrGauge: leaf.attrGauge,
    weightPerCm: leaf.weightPerCm,
    purity: leaf.purity,
    pureMetalName: leaf.pureMetalName,
    alloyMetalName: leaf.alloyMetalName,
  };
}

export async function saveFichaTecnica(
  input: SaveFichaInput
): Promise<FichaActionState> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Sessão expirada. Faça login novamente." };
  }

  if (!input.productId) {
    return { error: "Selecione uma peça para salvar a ficha técnica." };
  }

  const product = await prisma.product.findUnique({
    where: { id: input.productId, isDeleted: false },
    select: { id: true },
  });
  if (!product) {
    return { error: "Peça não encontrada." };
  }

  // Expande Ordens no servidor (fonte da verdade — não confiar só no client).
  const patternLines: SaveFichaMaterial[] = [];
  const applied = input.patternsApplied ?? [];
  if (applied.length > 0) {
    const ids = [...new Set(applied.map((a) => a.patternId).filter(Boolean))];
    const patterns = await prisma.supplyPattern.findMany({
      where: { id: { in: ids }, isActive: true },
      include: PATTERN_INCLUDE,
    });
    const byId = new Map(patterns.map((p) => [p.id, p]));

    for (const app of applied) {
      const pattern = byId.get(app.patternId);
      if (!pattern) continue;

      const stones = Math.max(0, Math.floor(Number(app.totalStones) || 0));
      const hasNonStone = pattern.items.some(
        (item) => item.itemKind !== "pedra"
      );
      // Pedras exigem total > 0; ordens só com metal/fio ainda expandem.
      if (stones <= 0 && !hasNonStone) continue;

      const expandable: ExpandablePattern = {
        id: pattern.id,
        name: pattern.name,
        items: pattern.items,
      };
      for (const leaf of expandPattern(expandable, stones)) {
        patternLines.push(toSaveLine(leaf));
      }
    }
  }

  // Avulsos: ignora linhas que já vieram marcadas como padrão (evita duplicar
  // se o client também enviou folhas expandidas).
  const avulsoLines = input.materials.filter(
    (line) =>
      line.name.trim() &&
      line.quantityUsed > 0 &&
      !line.sourcePatternId
  );

  const validLines = [...avulsoLines, ...patternLines];

  try {
    const usedByMaterial = new Map<
      string,
      {
        quantityUsed: number;
        sequenceOrder: number;
        lineKind: string;
        sourcePatternId: string | null;
        patternQty: number | null;
      }
    >();

    for (const [index, line] of validLines.entries()) {
      const name = resolveMaterialName(line);

      const attrs = {
        attrCut: line.attrCut?.trim() || null,
        attrColor: line.attrColor?.trim() || null,
        attrSizeMm: line.attrSizeMm ?? null,
        attrMaterial: line.attrMaterial ?? null,
        attrMesh: line.attrMesh ?? null,
        attrProfile: line.attrProfile ?? null,
        attrGauge: line.attrGauge ?? null,
        weightPerCm: line.weightPerCm ?? null,
        purity: line.purity ?? null,
        pureMetalName: line.pureMetalName ?? null,
        alloyMetalName: line.alloyMetalName ?? null,
      };

      const material = await prisma.material.upsert({
        where: { name },
        update: {
          type: line.type,
          purchasePrice: line.packagePrice,
          purchaseQuantity: line.packageQuantity,
          unit: line.unit,
          ...attrs,
        },
        create: {
          name,
          type: line.type,
          purchasePrice: line.packagePrice,
          purchaseQuantity: line.packageQuantity,
          unit: line.unit,
          ...attrs,
        },
        select: { id: true },
      });

      const sequenceOrder =
        typeof line.sequenceOrder === "number" && Number.isFinite(line.sequenceOrder)
          ? Math.max(0, Math.floor(line.sequenceOrder))
          : index;
      const lineKind = line.lineKind ?? "outro";
      const sourcePatternId = line.sourcePatternId?.trim() || null;
      const patternQty =
        line.patternQty !== null &&
        line.patternQty !== undefined &&
        Number.isFinite(line.patternQty)
          ? line.patternQty
          : null;

      const existing = usedByMaterial.get(material.id);
      if (existing) {
        existing.quantityUsed += line.quantityUsed;
        existing.sequenceOrder = Math.min(existing.sequenceOrder, sequenceOrder);
        // Mantém o padrão de origem se todas as linhas mergeadas forem do mesmo.
        if (
          existing.sourcePatternId &&
          sourcePatternId &&
          existing.sourcePatternId !== sourcePatternId
        ) {
          existing.sourcePatternId = null;
          existing.patternQty = null;
        }
      } else {
        usedByMaterial.set(material.id, {
          quantityUsed: line.quantityUsed,
          sequenceOrder,
          lineKind,
          sourcePatternId,
          patternQty,
        });
      }
    }

    const totalWeightG =
      input.totalWeightG === null || input.totalWeightG === undefined
        ? null
        : Number.isFinite(input.totalWeightG) && input.totalWeightG >= 0
          ? input.totalWeightG
          : null;

    await prisma.$transaction([
      prisma.compositionItem.deleteMany({
        where: { productId: input.productId },
      }),
      ...[...usedByMaterial.entries()].map(
        ([
          materialId,
          { quantityUsed, sequenceOrder, lineKind, sourcePatternId, patternQty },
        ]) =>
          prisma.compositionItem.create({
            data: {
              productId: input.productId,
              materialId,
              quantityUsed,
              sequenceOrder,
              lineKind,
              sourcePatternId,
              patternQty,
            },
          })
      ),
      prisma.product.update({
        where: { id: input.productId },
        data: {
          price: round2(input.sellingPrice),
          costPrice: round2(input.totalCost),
          pricingStrategy: input.mode,
          pricingValue: input.strategyValue,
          totalWeightG,
        },
      }),
    ]);
  } catch (error) {
    console.error("saveFichaTecnica:", error);
    return { error: "Não foi possível salvar a ficha técnica." };
  }

  revalidatePath("/allativa/painel/ficha-tecnica");
  revalidatePath("/allativa/painel/produtos");
  revalidatePath("/");
  revalidateTag("dashboard");

  return { success: true };
}
