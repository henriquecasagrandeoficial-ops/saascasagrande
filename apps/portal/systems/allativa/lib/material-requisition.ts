// lib/material-requisition.ts
// "Requisição de Materiais" — lista de COMPRA para o joalheiro encomendar no
// fornecedor tudo que precisa para confeccionar as peças de um pedido.
//
// Varre a ficha técnica (composição) de cada joia, agrupa insumos idênticos e
// soma quantidades/pesos. Ligas (ex.: 750) são decompostas nos metais base.

/**
 * Metadados estruturados de um insumo, transportados da Ficha Técnica até a
 * requisição. Todos opcionais: itens avulsos (digitados) não os preenchem.
 */
export interface InsumoAttrs {
  attrCut?: string | null;
  attrColor?: string | null;
  attrSizeMm?: number | null;
  attrMaterial?: string | null;
  attrMesh?: string | null;
  attrProfile?: string | null;
  attrGauge?: number | null;
  weightPerCm?: number | null;
  purity?: number | null;
  pureMetalName?: string | null;
  alloyMetalName?: string | null;
}

export interface RequisitionMaterial {
  name: string;
  type: string; // metal | gema | componente
  unit: string; // g | mg | ct | un | cm | par
  attrCut: string | null;
  attrColor: string | null;
  attrSizeMm: number | null;
  attrMaterial: string | null;
  attrMesh: string | null;
  attrProfile: string | null;
  attrGauge: number | null;
  weightPerCm: number | null;
  purity: number | null;
  pureMetalName: string | null;
  alloyMetalName: string | null;
}

export interface RequisitionCompositionItem {
  quantityUsed: number;
  material: RequisitionMaterial;
}

/**
 * `select` do Prisma para trazer os campos do material usados na requisição.
 * Mantém a query e o tipo `RequisitionMaterial` em sincronia.
 */
export const REQUISITION_MATERIAL_SELECT = {
  name: true,
  type: true,
  unit: true,
  attrCut: true,
  attrColor: true,
  attrSizeMm: true,
  attrMaterial: true,
  attrMesh: true,
  attrProfile: true,
  attrGauge: true,
  weightPerCm: true,
  purity: true,
  pureMetalName: true,
  alloyMetalName: true,
} as const;

export interface RequisitionOrderItem {
  /** Quantidade dessa joia no pedido (multiplica a composição). */
  quantity: number;
  compositionItems: RequisitionCompositionItem[];
}

export interface StoneRequisition {
  key: string;
  label: string;
  quantity: number;
}

export interface MetalRequisition {
  key: string;
  label: string;
  grams: number;
}

export interface LengthRequisition {
  key: string;
  label: string;
  cm: number;
  grams: number;
}

export interface OtherRequisition {
  key: string;
  label: string;
  quantity: number;
  unit: string;
}

export interface MaterialRequisition {
  stones: StoneRequisition[];
  metals: MetalRequisition[];
  chains: LengthRequisition[];
  wires: LengthRequisition[];
  others: OtherRequisition[];
  isEmpty: boolean;
}

// Remove sufixo de quantidade+unidade do nome, ex.: "Fio 0.45 (12 cm)" → "Fio 0.45".
const QUANTITY_SUFFIX = /\s*\(\s*\d+(?:[.,]\d+)?\s*(?:cm|un|g|mg|ct|par)\s*\)\s*$/i;

function cleanName(name: string): string {
  return (name || "").replace(QUANTITY_SUFFIX, "").trim();
}

function capitalize(value: string): string {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : value;
}

function sizeLabel(mm: number | null): string {
  if (mm === null || mm === undefined) return "";
  const rounded = Math.round(mm * 100) / 100;
  return `${rounded.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}mm`;
}

/** Descrição de uma pedra: "Zircônia Redonda Branca 2.0mm". */
function stoneBaseName(name: string): string {
  const cleaned = cleanName(name);
  // Nomes gerados pelo sequenciador usam " · " como separador.
  return cleaned.split(" · ")[0]?.trim() || cleaned;
}

function stoneLabel(m: RequisitionMaterial): string {
  const parts = [
    stoneBaseName(m.name),
    m.attrCut,
    m.attrColor,
    sizeLabel(m.attrSizeMm),
  ]
    .filter((p): p is string => Boolean(p && String(p).trim()))
    .map((p) => capitalize(String(p).trim()));

  // Remove tokens consecutivos duplicados (ex.: nome já contém a cor).
  const deduped: string[] = [];
  for (const part of parts) {
    const prev = deduped[deduped.length - 1];
    if (prev && prev.toLowerCase() === part.toLowerCase()) continue;
    deduped.push(part);
  }

  return deduped.length > 0 ? deduped.join(" ") : cleanName(m.name);
}

function chainLabel(m: RequisitionMaterial): string {
  const parts = [m.attrMesh, m.attrMaterial, sizeLabel(m.attrSizeMm)]
    .filter((p): p is string => Boolean(p && p.trim()))
    .map((p) => capitalize(p.trim()));
  return parts.length > 0 ? parts.join(" ") : cleanName(m.name);
}

function wireLabel(m: RequisitionMaterial): string {
  const gauge =
    m.attrGauge !== null && m.attrGauge !== undefined
      ? String(m.attrGauge)
      : "";
  const parts = [m.attrMaterial, m.attrProfile, gauge]
    .filter((p): p is string => Boolean(p && p.trim()))
    .map((p) => capitalize(p.trim()));
  return parts.length > 0 ? parts.join(" ") : cleanName(m.name);
}

function isWire(m: RequisitionMaterial): boolean {
  return m.unit === "cm" && (Boolean(m.attrProfile) || Boolean(m.attrGauge));
}

function isChain(m: RequisitionMaterial): boolean {
  return m.unit === "cm" && Boolean(m.attrMesh);
}

function isAlloy(m: RequisitionMaterial): boolean {
  return (
    m.purity !== null &&
    m.purity !== undefined &&
    m.purity > 0 &&
    m.purity < 1
  );
}

/**
 * Agrega os insumos de todas as joias do pedido em uma requisição de compra.
 * Executada no servidor antes de devolver os dados para impressão.
 */
export function calculateMaterialsForOrder(
  orderItems: RequisitionOrderItem[]
): MaterialRequisition {
  const stones = new Map<string, StoneRequisition>();
  const metals = new Map<string, MetalRequisition>();
  const chains = new Map<string, LengthRequisition>();
  const wires = new Map<string, LengthRequisition>();
  const others = new Map<string, OtherRequisition>();

  const addMetal = (label: string, grams: number) => {
    const key = label.toLowerCase();
    const existing = metals.get(key);
    if (existing) existing.grams += grams;
    else metals.set(key, { key, label, grams });
  };

  for (const item of orderItems) {
    const multiplier = Math.max(1, Math.floor(item.quantity || 1));

    for (const comp of item.compositionItems ?? []) {
      const m = comp.material;
      if (!m) continue;
      const used = (comp.quantityUsed || 0) * multiplier;
      if (used <= 0) continue;

      const type = (m.type || "").toLowerCase();

      // ── GEMAS ──
      if (type === "gema") {
        const color = (m.attrColor ?? "").trim();
        const cut = (m.attrCut ?? "").trim();
        const base = stoneBaseName(m.name);
        const label = stoneLabel(m);
        // Agrupa por modelo + lapidação + cor + tamanho.
        const key = `${base.toLowerCase()}|${cut.toLowerCase()}|${color.toLowerCase()}|${
          m.attrSizeMm ?? ""
        }`;
        if (process.env.NODE_ENV === "development") {
          console.log("[requisition:stone]", {
            name: m.name,
            attrCut: cut || null,
            attrColor: color || null,
            attrSizeMm: m.attrSizeMm,
            label,
            qty: used,
          });
        }
        const existing = stones.get(key);
        if (existing) existing.quantity += used;
        else stones.set(key, { key, label, quantity: used });
        continue;
      }

      // ── FIOS E CHAPAS ──
      if (isWire(m)) {
        const label = wireLabel(m);
        const key = `${(m.attrMaterial ?? "")}|${(m.attrProfile ?? "")}|${
          m.attrGauge ?? ""
        }|${label.toLowerCase()}`;
        const grams = (m.weightPerCm ?? 0) * used;
        const existing = wires.get(key);
        if (existing) {
          existing.cm += used;
          existing.grams += grams;
        } else {
          wires.set(key, { key, label, cm: used, grams });
        }
        continue;
      }

      // ── CORRENTES ──
      if (isChain(m)) {
        const label = chainLabel(m);
        const key = `${(m.attrMesh ?? "")}|${(m.attrMaterial ?? "")}|${
          m.attrSizeMm ?? ""
        }|${label.toLowerCase()}`;
        const grams = (m.weightPerCm ?? 0) * used;
        const existing = chains.get(key);
        if (existing) {
          existing.cm += used;
          existing.grams += grams;
        } else {
          chains.set(key, { key, label, cm: used, grams });
        }
        continue;
      }

      // ── METAIS E LIGAS ──
      if (type === "metal") {
        if (isAlloy(m)) {
          const purity = m.purity as number;
          const pure = m.pureMetalName?.trim() || "Metal nobre";
          const alloy = m.alloyMetalName?.trim() || "Pré-liga";
          addMetal(pure, used * purity);
          addMetal(alloy, used * (1 - purity));
        } else {
          const label = m.attrMaterial?.trim() || cleanName(m.name);
          addMetal(label, used);
        }
        continue;
      }

      // ── OUTROS COMPONENTES ──
      {
        const label = cleanName(m.name);
        const unit = m.unit || "un";
        const key = `${label.toLowerCase()}|${unit}`;
        const existing = others.get(key);
        if (existing) existing.quantity += used;
        else others.set(key, { key, label, quantity: used, unit });
      }
    }
  }

  const byLabel = <T extends { label: string }>(a: T, b: T) =>
    a.label.localeCompare(b.label, "pt-BR");

  const stonesList = [...stones.values()].sort(byLabel);
  const metalsList = [...metals.values()].sort(byLabel);
  const chainsList = [...chains.values()].sort(byLabel);
  const wiresList = [...wires.values()].sort(byLabel);
  const othersList = [...others.values()].sort(byLabel);

  return {
    stones: stonesList,
    metals: metalsList,
    chains: chainsList,
    wires: wiresList,
    others: othersList,
    isEmpty:
      stonesList.length === 0 &&
      metalsList.length === 0 &&
      chainsList.length === 0 &&
      wiresList.length === 0 &&
      othersList.length === 0,
  };
}

// ── Formatação para a impressão térmica ──

function trimNumber(value: number, maxDigits = 2): string {
  const rounded = Math.round((value + Number.EPSILON) * 1000) / 1000;
  return Number.isInteger(rounded)
    ? String(rounded)
    : rounded.toLocaleString("pt-BR", { maximumFractionDigits: maxDigits });
}

export function formatGrams(value: number): string {
  return `${trimNumber(value, 2)}g`;
}

export function formatCentimeters(value: number): string {
  return `${trimNumber(value, 1)}cm`;
}

export function formatStoneQty(value: number): string {
  return `${trimNumber(value, 0)}x`;
}
