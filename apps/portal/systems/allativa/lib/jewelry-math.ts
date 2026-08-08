// lib/jewelry-math.ts
// Lógica de engenharia de peças da AllAtiva Joias, isolada dos componentes React:
//  • Calculadora de ligas metálicas (teor 750, 585, etc.)
//  • Sequenciador visual de pedras (repetição de padrão)
//  • Custos de fios/correntes por centímetro
//  • Mapa de cores para a visualização da cravação

// ─────────────────────────────────────────────────────────────
// Ligas metálicas
// ─────────────────────────────────────────────────────────────

export interface AlloyInput {
  /** Peso final desejado da liga (g). Ex.: 10g de Ouro 18k. */
  finalWeight: number;
  /** Teor do metal nobre (0–1). Ex.: 0.75 para 18k. */
  purity: number;
  /** R$/g do metal nobre puro (ex.: Ouro 24k). */
  pureMetalPricePerG: number;
  /** R$/g da pré-liga de adição (Prata/Cobre). */
  alloyMetalPricePerG: number;
}

export interface AlloyResult {
  finalWeight: number;
  purity: number;
  /** Gramas do metal nobre puro. */
  pureWeight: number;
  /** Gramas da pré-liga de adição. */
  alloyWeight: number;
  pureCost: number;
  alloyCost: number;
  totalCost: number;
  /** Custo por grama da liga final. */
  costPerGram: number;
}

/** Converte quilates (ex.: 18) em teor fracionário (0–1). */
export function karatToPurity(karat: number): number {
  if (!Number.isFinite(karat) || karat <= 0) return 0;
  return Math.min(karat / 24, 1);
}

/** Converte teor fracionário (0–1) em milésimos (ex.: 0.75 → 750). */
export function purityToThousandths(purity: number): number {
  return Math.round(purity * 1000);
}

/**
 * Calcula a proporção metal nobre × pré-liga (padrão de ourivesaria).
 *
 * Regra de mercado — sempre relativa a 1g da liga final:
 *   • teor P (ex.: 0,75 = 18k / Au750)
 *   • P g de metal nobre puro + (1−P) g de pré-liga = 1g de liga
 *
 * Ex. Ouro 18k: 0,75g ouro 24k + 0,25g pré-liga.
 * Custo/g = (P × R$/g nobre) + ((1−P) × R$/g pré-liga)
 *
 * O `finalWeight` apenas escala essa base de 1g (ex.: 10g → ×10).
 */
export function computeAlloy(input: AlloyInput): AlloyResult {
  const finalWeight = Math.max(input.finalWeight || 0, 0);
  const purity = Math.min(Math.max(input.purity || 0, 0), 1);

  // Base unitária (1g de liga final) → escala pelo peso desejado
  const pureWeight = finalWeight * purity;
  const alloyWeight = finalWeight * (1 - purity);

  const pureCost = pureWeight * (input.pureMetalPricePerG || 0);
  const alloyCost = alloyWeight * (input.alloyMetalPricePerG || 0);
  const totalCost = pureCost + alloyCost;

  // Custo por 1g: independe do peso desejado (é a herança oficial da mistura)
  const costPerGram =
    purity * (input.pureMetalPricePerG || 0) +
    (1 - purity) * (input.alloyMetalPricePerG || 0);

  return {
    finalWeight,
    purity,
    pureWeight,
    alloyWeight,
    pureCost,
    alloyCost,
    totalCost,
    costPerGram,
  };
}

// ─────────────────────────────────────────────────────────────
// Fios, chapas e correntes (custo por comprimento)
// ─────────────────────────────────────────────────────────────

/** Custo de fio/chapa via herança da liga: (cm × peso/cm) × R$/g da liga. */
export function wireCostFromAlloy(
  weightPerCm: number | null | undefined,
  centimeters: number,
  pricePerGram: number
): { weightG: number; cost: number; pricePerCm: number } {
  const cm = Math.max(centimeters || 0, 0);
  const wpc = Math.max(weightPerCm || 0, 0);
  const ppg = Math.max(pricePerGram || 0, 0);
  const weightG = wpc * cm;
  return {
    weightG,
    cost: weightG * ppg,
    pricePerCm: wpc * ppg,
  };
}

/** Peso total (g) de um insumo com peso por cm informado. */
export function lengthWeight(
  weightPerCm: number | null | undefined,
  centimeters: number
): number {
  return Math.max(weightPerCm || 0, 0) * Math.max(centimeters || 0, 0);
}

export function lengthCost(
  pricePerCm: number | null | undefined,
  centimeters: number
): number {
  return Math.max(pricePerCm || 0, 0) * Math.max(centimeters || 0, 0);
}

// ─────────────────────────────────────────────────────────────
// Sequenciador de pedras (Pattern Builder)
// ─────────────────────────────────────────────────────────────

export interface SequenceStone {
  id: string;
  name: string;
  color: string;
  /** Lapidação/modelo (ex.: redonda, navete) — usado na requisição. */
  cut?: string;
  /** Tamanho em mm — usado no agrupamento da requisição. */
  sizeMm?: number | null;
  /** Peso por pedra em quilates. */
  weightCt: number;
  /** Valor por pedra. */
  unitPrice: number;
}

export interface SequenceGroup {
  stoneId: string;
  name: string;
  color: string;
  colorHex: string;
  cut?: string;
  sizeMm?: number | null;
  weightCt: number;
  unitPrice: number;
  count: number;
  totalWeightCt: number;
  totalValue: number;
}

export interface SequenceResult {
  requestedTotal: number;
  /** Total efetivamente distribuído (== requestedTotal quando há padrão). */
  totalStones: number;
  groups: SequenceGroup[];
  /** Ordem completa (ids) da cravação, útil para a visualização. */
  sequence: string[];
  totalWeightCt: number;
  totalValue: number;
}

/**
 * Distribuição sequencial (round-robin) de um total por N slots.
 *
 * Ex.: total=17, slots=10 → base=1, resto=7
 * → [2,2,2,2,2,2,2,1,1,1] (as 7 primeiras recebem +1).
 */
export function distributeRoundRobin(
  total: number,
  slotCount: number
): number[] {
  const n = Math.max(Math.floor(Number(total) || 0), 0);
  const k = Math.max(Math.floor(Number(slotCount) || 0), 0);
  if (k === 0) return [];
  if (n === 0) return Array.from({ length: k }, () => 0);

  const base = Math.floor(n / k);
  const remainder = n % k;
  return Array.from({ length: k }, (_, i) => base + (i < remainder ? 1 : 0));
}

/**
 * Repete o padrão informado até atingir a quantidade total de pedras da peça,
 * agrupando por pedra e somando peso e valor.
 *
 * Ex.: padrão [Rosa, Verde, Azul] com total 45 → 15 de cada, com o somatório
 * do peso (ct) e do valor de todas as 45 pedras.
 */
export function buildStoneSequence(
  pattern: SequenceStone[],
  total: number
): SequenceResult {
  const requestedTotal = Math.max(Math.floor(total || 0), 0);

  const empty: SequenceResult = {
    requestedTotal,
    totalStones: 0,
    groups: [],
    sequence: [],
    totalWeightCt: 0,
    totalValue: 0,
  };

  if (pattern.length === 0 || requestedTotal === 0) return empty;

  const sequence: string[] = [];
  const counts = new Map<string, number>();

  // Round-robin: equivalente a distributeRoundRobin por slot do padrão.
  for (let i = 0; i < requestedTotal; i++) {
    const stone = pattern[i % pattern.length];
    sequence.push(stone.id);
    counts.set(stone.id, (counts.get(stone.id) ?? 0) + 1);
  }

  // Um grupo por pedra distinta, preservando a ordem de aparição no padrão.
  const seen = new Set<string>();
  const groups: SequenceGroup[] = [];

  for (const stone of pattern) {
    if (seen.has(stone.id)) continue;
    seen.add(stone.id);

    const count = counts.get(stone.id) ?? 0;
    const totalWeightCt = count * (stone.weightCt || 0);
    const totalValue = count * (stone.unitPrice || 0);

    groups.push({
      stoneId: stone.id,
      name: stone.name,
      color: stone.color,
      colorHex: colorToHex(stone.color),
      cut: stone.cut,
      sizeMm: stone.sizeMm ?? null,
      weightCt: stone.weightCt || 0,
      unitPrice: stone.unitPrice || 0,
      count,
      totalWeightCt,
      totalValue,
    });
  }

  const totalWeightCt = groups.reduce((s, g) => s + g.totalWeightCt, 0);
  const totalValue = groups.reduce((s, g) => s + g.totalValue, 0);

  return {
    requestedTotal,
    totalStones: requestedTotal,
    groups,
    sequence,
    totalWeightCt,
    totalValue,
  };
}

// ─────────────────────────────────────────────────────────────
// Cores → hex (para as bolinhas do sequenciador)
// ─────────────────────────────────────────────────────────────

const COLOR_MAP: Record<string, string> = {
  branco: "#f1f5f9",
  cristal: "#e2e8f0",
  transparente: "#e5e7eb",
  preto: "#1e293b",
  black: "#1e293b",
  cinza: "#94a3b8",
  prata: "#cbd5e1",
  dourado: "#d4af37",
  ouro: "#d4af37",
  champagne: "#f7e7ce",
  rosa: "#f472b6",
  pink: "#ec4899",
  vermelho: "#ef4444",
  rubi: "#e11d48",
  vinho: "#881337",
  bordo: "#7f1d1d",
  laranja: "#f97316",
  amarelo: "#eab308",
  citrino: "#f59e0b",
  verde: "#22c55e",
  esmeralda: "#059669",
  agua: "#67e8f9",
  "agua-marinha": "#22d3ee",
  aguamarinha: "#22d3ee",
  turquesa: "#14b8a6",
  azul: "#3b82f6",
  safira: "#1d4ed8",
  marinho: "#1e3a8a",
  roxo: "#a855f7",
  violeta: "#8b5cf6",
  ametista: "#9333ea",
  lilas: "#c4b5fd",
  marrom: "#92400e",
  fume: "#57534e",
  fumê: "#57534e",
};

/** Normaliza removendo acentos e caixa. */
function normalize(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/**
 * Converte um nome de cor (pt-BR) em hex para a visualização da cravação.
 * Faz correspondência exata, depois parcial e, por fim, gera uma cor
 * determinística a partir do texto (para nomes desconhecidos).
 */
export function colorToHex(colorName: string): string {
  if (!colorName) return "#94a3b8";
  const key = normalize(colorName);

  if (COLOR_MAP[key]) return COLOR_MAP[key];

  for (const [name, hex] of Object.entries(COLOR_MAP)) {
    if (key.includes(name) || name.includes(key)) return hex;
  }

  // Fallback determinístico: hash simples → matiz HSL.
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = key.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return hslToHex(hue, 55, 60);
}

function hslToHex(h: number, s: number, l: number): string {
  const sN = s / 100;
  const lN = l / 100;
  const c = (1 - Math.abs(2 * lN - 1)) * sN;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = lN - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const toHex = (v: number) =>
    Math.round((v + m) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}
