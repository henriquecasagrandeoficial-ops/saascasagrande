// Expansão de Ordens/Kits (SupplyPattern) para folhas de BOM.
// Pedras: round-robin pela Quantidade Total de Pedras.
// Metais/correntes/fios: quantidade fixa cadastrada na Ordem (1 aplicação).

import { distributeRoundRobin, wireCostFromAlloy } from "@allativa/lib/jewelry-math";
import type { InsumoAttrs } from "@allativa/lib/material-requisition";
import type { MaterialType, Unit } from "@allativa/lib/pricing";

export type PatternItemKind = "pedra" | "metal" | "corrente" | "fio";

export type ExpandableStone = {
  id: string;
  name: string;
  cut: string;
  color: string;
  sizeMm: number | null;
  unitPrice: number;
};

export type ExpandableAlloy = {
  id: string;
  name: string;
  purity: number;
  pureMetalName: string;
  alloyMetalName: string;
  pricePerGram: number;
};

export type ExpandableChain = {
  id: string;
  name: string;
  mesh: string;
  material: string;
  thicknessMm: number | null;
  pricePerCm: number;
  weightPerCm: number | null;
};

export type ExpandableWire = {
  id: string;
  name: string;
  material: string;
  profile: string;
  gauge: number;
  pricePerCm: number;
  weightPerCm: number | null;
  alloy?: { id: string; name: string; pricePerGram: number } | null;
};

export type ExpandablePatternItem = {
  id: string;
  itemKind: string;
  sequenceOrder: number;
  quantity: number;
  stone?: ExpandableStone | null;
  alloy?: ExpandableAlloy | null;
  chain?: ExpandableChain | null;
  wire?: ExpandableWire | null;
};

export type ExpandablePattern = {
  id: string;
  name: string;
  items: ExpandablePatternItem[];
};

export type ExpandedLeaf = {
  name: string;
  type: MaterialType;
  lineKind: PatternItemKind;
  packagePrice: number;
  packageQuantity: number;
  unit: Unit;
  quantityUsed: number;
  sequenceOrder: number;
  sourcePatternId: string;
  /** Snapshot: quantidade total de pedras informada na ficha (não kits). */
  patternQty: number;
  patternName: string;
} & InsumoAttrs;

export type StoneDistributionRow = {
  sequenceOrder: number;
  stoneId: string;
  name: string;
  color: string;
  cut: string;
  sizeMm: number | null;
  unitPrice: number;
  count: number;
};

const emptyAttrs = (): InsumoAttrs => ({
  attrCut: null,
  attrColor: null,
  attrSizeMm: null,
  attrMaterial: null,
  attrMesh: null,
  attrProfile: null,
  attrGauge: null,
  weightPerCm: null,
  purity: null,
  pureMetalName: null,
  alloyMetalName: null,
});

function stoneName(stone: ExpandableStone): string {
  return [stone.name, stone.cut, stone.color, stone.sizeMm != null ? `${stone.sizeMm}mm` : null]
    .filter(Boolean)
    .join(" · ");
}

function sortedItems(pattern: ExpandablePattern): ExpandablePatternItem[] {
  return [...(pattern.items ?? [])].sort(
    (a, b) => (a.sequenceOrder ?? 0) - (b.sequenceOrder ?? 0)
  );
}

/**
 * Preview da distribuição de pedras (round-robin) para a UI do ourives.
 */
export function distributePatternStones(
  pattern: ExpandablePattern,
  totalStones: number
): StoneDistributionRow[] {
  const stoneItems = sortedItems(pattern).filter(
    (item) => item.itemKind === "pedra" && item.stone
  );
  const counts = distributeRoundRobin(totalStones, stoneItems.length);

  return stoneItems.map((item, index) => {
    const s = item.stone!;
    return {
      sequenceOrder: item.sequenceOrder,
      stoneId: s.id,
      name: stoneName(s),
      color: s.color,
      cut: s.cut,
      sizeMm: s.sizeMm,
      unitPrice: s.unitPrice,
      count: counts[index] ?? 0,
    };
  });
}

/**
 * Expande uma Ordem para folhas de BOM.
 *
 * - Pedras: round-robin de `totalStones` pelas cores/linhas da Ordem.
 * - Demais insumos: quantidade cadastrada na Ordem (1 aplicação).
 * - `patternQty` gravado = totalStones (auditoria / reload).
 */
export function expandPattern(
  pattern: ExpandablePattern,
  totalStones: number
): ExpandedLeaf[] {
  const total = Math.max(Math.floor(Number(totalStones) || 0), 0);
  const items = sortedItems(pattern);
  if (!items.length) return [];

  const leaves: ExpandedLeaf[] = [];
  const stoneItems = items.filter(
    (item) => item.itemKind === "pedra" && item.stone
  );
  const counts = distributeRoundRobin(total, stoneItems.length);

  stoneItems.forEach((item, index) => {
    const qty = counts[index] ?? 0;
    if (qty <= 0 || !item.stone) return;
    const s = item.stone;
    leaves.push({
      ...emptyAttrs(),
      name: stoneName(s),
      type: "gema",
      lineKind: "pedra",
      packagePrice: s.unitPrice,
      packageQuantity: 1,
      unit: "un",
      quantityUsed: qty,
      sequenceOrder: item.sequenceOrder,
      sourcePatternId: pattern.id,
      patternQty: total,
      patternName: pattern.name,
      attrCut: s.cut?.trim() || null,
      attrColor: s.color?.trim() || null,
      attrSizeMm: s.sizeMm ?? null,
    });
  });

  for (const item of items) {
    const kind = item.itemKind as PatternItemKind;
    if (kind === "pedra") continue;

    const qty = Math.max(item.quantity || 0, 0);
    if (qty <= 0) continue;

    if (kind === "metal" && item.alloy) {
      const a = item.alloy;
      leaves.push({
        ...emptyAttrs(),
        name: a.name,
        type: "metal",
        lineKind: "metal",
        packagePrice: a.pricePerGram,
        packageQuantity: 1,
        unit: "g",
        quantityUsed: qty,
        sequenceOrder: item.sequenceOrder,
        sourcePatternId: pattern.id,
        patternQty: total,
        patternName: pattern.name,
        attrMaterial: a.name,
        purity: a.purity,
        pureMetalName: a.pureMetalName,
        alloyMetalName: a.alloyMetalName,
      });
      continue;
    }

    if (kind === "corrente" && item.chain) {
      const c = item.chain;
      leaves.push({
        ...emptyAttrs(),
        name: c.name,
        type: "componente",
        lineKind: "corrente",
        packagePrice: c.pricePerCm,
        packageQuantity: 1,
        unit: "cm",
        quantityUsed: qty,
        sequenceOrder: item.sequenceOrder,
        sourcePatternId: pattern.id,
        patternQty: total,
        patternName: pattern.name,
        attrMesh: c.mesh,
        attrMaterial: c.material,
        attrSizeMm: c.thicknessMm,
        weightPerCm: c.weightPerCm,
      });
      continue;
    }

    if (kind === "fio" && item.wire) {
      const w = item.wire;
      const pricePerGram = w.alloy?.pricePerGram ?? 0;
      const { weightG } = wireCostFromAlloy(w.weightPerCm, qty, pricePerGram);
      leaves.push({
        ...emptyAttrs(),
        name: w.name,
        type: "metal",
        lineKind: "fio",
        packagePrice: pricePerGram || w.pricePerCm,
        packageQuantity: 1,
        unit: weightG > 0 ? "g" : "cm",
        quantityUsed: weightG > 0 ? weightG : qty,
        sequenceOrder: item.sequenceOrder,
        sourcePatternId: pattern.id,
        patternQty: total,
        patternName: pattern.name,
        weightPerCm: w.weightPerCm,
        attrProfile: w.profile,
        attrMaterial: w.alloy?.name ?? w.material,
        attrGauge: w.gauge,
      });
    }
  }

  return leaves;
}

/** Expande várias aplicações de Ordem e concatena as folhas. */
export function expandPatterns(
  applications: { pattern: ExpandablePattern; totalStones: number }[]
): ExpandedLeaf[] {
  return applications.flatMap(({ pattern, totalStones }) =>
    expandPattern(pattern, totalStones)
  );
}
