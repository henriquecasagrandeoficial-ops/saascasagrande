// Motor de cálculo da Ficha Técnica (precificação de joias).
// Funções puras, sem dependência de React/UI, para facilitar testes.

// Unidades de ourivesaria:
// g/mg → metais (ouro, prata); ct → gemas/diamantes (quilates);
// un → componentes (fechos, correntes); cm → correntes por comprimento;
// par → brincos.
export const UNITS = ["g", "mg", "ct", "un", "cm", "par"] as const;
export type Unit = (typeof UNITS)[number];

// Tipo do material, para adaptar a seleção entre metais e gemas.
export const MATERIAL_TYPES = ["metal", "gema", "componente"] as const;
export type MaterialType = (typeof MATERIAL_TYPES)[number];

export type PricingMode =
  | "markupPercent" // 1. Lucro sobre custo % (marcação)
  | "marginPercent" // 2. Margem de lucro %
  | "fixedProfit" // 3. Valor fixo de lucro (R$)
  | "finalPrice"; // 4. Informar preço final

export type MaterialLine = {
  name: string;
  packagePrice: number; // custo do lote/compra fechada (R$)
  packageQuantity: number; // quantidade contida na compra
  unit: Unit;
  quantityUsed: number; // quantidade usada na peça (mesma unidade)
};

export type AdditionalCostKind = "fixed" | "percent";

export type AdditionalCost = {
  label: string;
  kind: AdditionalCostKind; // fixed = R$ | percent = % sobre o preço de venda
  value: number;
  isPackaging?: boolean; // marca custos de embalagem (para alertas)
};

export type PricingInput = {
  materials: MaterialLine[];
  additionalCosts: AdditionalCost[];
  mode: PricingMode;
  strategyValue: number;
};

export type MaterialCost = {
  name: string;
  quantityUsed: number; // quantidade usada na peça
  unit: Unit; // unidade da quantidade usada
  cost: number; // custo rateado na composição
  sharePercent: number; // participação no custo da composição
};

export type PricingResult = {
  compositionCost: number; // custo dos materiais (metais + gemas + componentes)
  additionalFixedCost: number; // soma dos custos adicionais fixos (R$)
  additionalPercentRate: number; // soma dos percentuais (fração 0–1)
  additionalPercentCost: number; // valor em R$ dos percentuais sobre o preço
  packagingCost: number; // total marcado como embalagem (R$ fixo)
  totalCost: number; // custo total (fixo + percentual sobre preço)
  sellingPrice: number; // preço de venda sugerido/final
  netProfit: number; // lucro líquido (R$)
  marginPercent: number; // margem = lucro / preço * 100
  markupPercent: number; // markup = lucro / custo * 100
  materialCosts: MaterialCost[];
  costliestMaterial: string | null;
  isValid: boolean; // false quando a estratégia gera preço impossível
};

const clampNonNegative = (value: number): number =>
  Number.isFinite(value) && value > 0 ? value : 0;

/** Custo rateado de um material: (usado / lote) * preço do lote. */
export function computeMaterialCost(line: MaterialLine): number {
  const packageQuantity = clampNonNegative(line.packageQuantity);
  if (packageQuantity === 0) return 0;

  const used = clampNonNegative(line.quantityUsed);
  const price = clampNonNegative(line.packagePrice);

  return (used / packageQuantity) * price;
}

/** Soma o custo de todos os materiais da composição da joia. */
export function computeCompositionCost(materials: MaterialLine[]): number {
  return materials.reduce((sum, line) => sum + computeMaterialCost(line), 0);
}

/**
 * Resolve o preço de venda de acordo com a estratégia, tratando o fato de
 * que custos percentuais (taxa de cartão, comissão) incidem sobre o próprio
 * preço de venda — o que gera uma dependência circular resolvida por álgebra.
 */
function resolveSellingPrice(
  baseCost: number,
  percentRate: number,
  mode: PricingMode,
  strategyValue: number
): { price: number; isValid: boolean } {
  const value = Number.isFinite(strategyValue) ? strategyValue : 0;

  switch (mode) {
    case "markupPercent": {
      const m = value / 100;
      const denominator = 1 - percentRate * (1 + m);
      if (denominator <= 0) return { price: 0, isValid: false };
      return { price: (baseCost * (1 + m)) / denominator, isValid: true };
    }
    case "marginPercent": {
      const mg = value / 100;
      const denominator = 1 - percentRate - mg;
      if (mg >= 1 || denominator <= 0) return { price: 0, isValid: false };
      return { price: baseCost / denominator, isValid: true };
    }
    case "fixedProfit": {
      const denominator = 1 - percentRate;
      if (denominator <= 0) return { price: 0, isValid: false };
      return { price: (baseCost + value) / denominator, isValid: true };
    }
    case "finalPrice": {
      return { price: clampNonNegative(value), isValid: value > 0 };
    }
    default:
      return { price: 0, isValid: false };
  }
}

/** Calcula o resultado financeiro completo da ficha técnica. */
export function computePricing(input: PricingInput): PricingResult {
  const compositionCost = computeCompositionCost(input.materials);

  let additionalFixedCost = 0;
  let additionalPercentRate = 0;
  let packagingCost = 0;

  for (const cost of input.additionalCosts) {
    const value = clampNonNegative(cost.value);
    if (cost.kind === "fixed") {
      additionalFixedCost += value;
      if (cost.isPackaging) packagingCost += value;
    } else {
      additionalPercentRate += value / 100;
    }
  }

  const baseCost = compositionCost + additionalFixedCost;

  const { price, isValid } = resolveSellingPrice(
    baseCost,
    additionalPercentRate,
    input.mode,
    input.strategyValue
  );

  const sellingPrice = clampNonNegative(price);
  const additionalPercentCost = sellingPrice * additionalPercentRate;
  const totalCost = baseCost + additionalPercentCost;
  const netProfit = sellingPrice - totalCost;

  const marginPercent = sellingPrice > 0 ? (netProfit / sellingPrice) * 100 : 0;
  const markupPercent = totalCost > 0 ? (netProfit / totalCost) * 100 : 0;

  const materialCosts: MaterialCost[] = input.materials.map((line) => {
    const cost = computeMaterialCost(line);
    return {
      name: line.name.trim() || "Material",
      quantityUsed: clampNonNegative(line.quantityUsed),
      unit: line.unit,
      cost,
      sharePercent: compositionCost > 0 ? (cost / compositionCost) * 100 : 0,
    };
  });

  const costliest = materialCosts.reduce<MaterialCost | null>(
    (max, item) => (max === null || item.cost > max.cost ? item : max),
    null
  );

  return {
    compositionCost,
    additionalFixedCost,
    additionalPercentRate,
    additionalPercentCost,
    packagingCost,
    totalCost,
    sellingPrice,
    netProfit,
    marginPercent,
    markupPercent,
    materialCosts,
    costliestMaterial:
      costliest && costliest.cost > 0 ? costliest.name : null,
    isValid,
  };
}

export type SimulationRow = {
  markupPercent: number;
  sellingPrice: number;
  netProfit: number;
  marginPercent: number;
};

/** Simula o preço para diferentes cenários de marcação (lucro sobre custo). */
export function buildSimulation(
  baseCost: number,
  percentRate: number,
  scenarios: number[] = [50, 80, 100, 150, 200]
): SimulationRow[] {
  return scenarios.map((markup) => {
    const { price } = resolveSellingPrice(
      baseCost,
      percentRate,
      "markupPercent",
      markup
    );
    const totalCost = baseCost + price * percentRate;
    const netProfit = price - totalCost;
    const marginPercent = price > 0 ? (netProfit / price) * 100 : 0;
    return { markupPercent: markup, sellingPrice: price, netProfit, marginPercent };
  });
}

export type ProjectionRow = {
  units: number;
  revenue: number;
  profit: number;
};

/** Projeção de faturamento e lucro para volumes de venda. */
export function buildProjection(
  sellingPrice: number,
  profitPerUnit: number,
  volumes: number[] = [5, 10, 25, 50]
): ProjectionRow[] {
  return volumes.map((units) => ({
    units,
    revenue: sellingPrice * units,
    profit: profitPerUnit * units,
  }));
}

export type FinancialAlert = {
  level: "danger" | "warning" | "info" | "success";
  message: string;
};

/** Gera alertas/dicas financeiras a partir do resultado calculado. */
export function buildAlerts(result: PricingResult): FinancialAlert[] {
  const alerts: FinancialAlert[] = [];

  if (!result.isValid) {
    alerts.push({
      level: "danger",
      message:
        "A combinação de custos percentuais e estratégia é inviável (o preço tenderia ao infinito). Ajuste a margem ou as taxas.",
    });
    return alerts;
  }

  if (result.sellingPrice <= 0) {
    alerts.push({
      level: "info",
      message: "Preencha a composição da joia para calcular o preço de venda.",
    });
    return alerts;
  }

  if (result.netProfit <= 0) {
    alerts.push({
      level: "danger",
      message:
        "Prejuízo: o preço de venda não cobre o custo total. Reveja a precificação.",
    });
  } else if (result.marginPercent < 30) {
    alerts.push({
      level: "warning",
      message:
        "Margem enxuta para o setor joalheiro (abaixo de 30%). Avalie mão de obra, cravação e taxas.",
    });
  } else if (result.marginPercent >= 60) {
    alerts.push({
      level: "success",
      message: "Excelente margem de lucro. Confira se o preço está competitivo.",
    });
  }

  if (
    result.packagingCost > 0 &&
    result.totalCost > 0 &&
    result.packagingCost / result.totalCost > 0.15
  ) {
    alerts.push({
      level: "warning",
      message:
        "A embalagem de luxo representa mais de 15% do custo total. Reavalie o fornecedor.",
    });
  }

  const costliest = result.materialCosts.reduce<
    (typeof result.materialCosts)[number] | null
  >((max, item) => (max === null || item.cost > max.cost ? item : max), null);

  if (
    costliest &&
    result.compositionCost > 0 &&
    costliest.cost / result.compositionCost > 0.5
  ) {
    alerts.push({
      level: "warning",
      message: `O material "${costliest.name}" concentra mais da metade do custo da peça. Avalie fornecedores ou o peso empregado.`,
    });
  }

  if (result.additionalPercentRate >= 0.2) {
    alerts.push({
      level: "warning",
      message:
        "Taxas percentuais (cartão/comissão) somam 20% ou mais do preço. Isso reduz bastante o lucro líquido.",
    });
  }

  return alerts;
}
