"use client";

import Image from "next/image";
import { useMemo, useState, useTransition } from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  ClipboardList,
  Gem,
  Link2,
  Loader2,
  Plus,
  Save,
  Sparkles,
  Trash2,
  Waves,
} from "lucide-react";

import {
  saveFichaTecnica,
  type FichaLineKind,
  type SaveFichaInput,
} from "@/app/allativa/painel/ficha-tecnica/actions";
import {
  computePricing,
  UNITS,
  type MaterialType,
  type PricingInput,
  type PricingMode,
  type Unit,
} from "@allativa/lib/pricing";
import { wireCostFromAlloy } from "@allativa/lib/jewelry-math";
import type { SequenceStone } from "@allativa/lib/jewelry-math";
import type { InsumoAttrs } from "@allativa/lib/material-requisition";
import {
  expandPattern,
  distributePatternStones,
  type ExpandablePattern,
} from "@allativa/lib/supply-pattern-expand";
import type {
  AlloyOption,
  ChainOption,
  WireOption,
} from "@allativa/components/admin/piece-builders";
import { Button } from "@allativa/components/ui/button";
import { Input } from "@allativa/components/ui/input";
import { Label } from "@allativa/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@allativa/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@allativa/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@allativa/components/ui/popover";
import { DataTableFacetedFilter } from "@allativa/components/admin/data-table-faceted-filter";
import { DataTableToolbar } from "@allativa/components/admin/data-table-toolbar";
import { FichaResults } from "./ficha-results";

type MaterialOption = {
  id: string;
  name: string;
  type: string;
  purchasePrice: number;
  purchaseQuantity: number;
  unit: string;
} & InsumoAttrs;

type CategoryOption = {
  id: string;
  name: string;
};

type ProductOption = {
  id: string;
  title: string;
  imageUrl: string;
  productCode: string | null;
  totalWeightG: number | null;
  price: number;
  isAvailable: boolean;
  categoryId: string | null;
  category: { id: string; name: string } | null;
  pricingStrategy: string | null;
  pricingValue: number | null;
  compositionItems: {
    quantityUsed: number;
    sequenceOrder: number;
    lineKind: string;
    sourcePatternId: string | null;
    patternQty: number | null;
    sourcePattern: { id: string; name: string } | null;
    material: MaterialOption;
  }[];
};

type SupplyPatternOption = ExpandablePattern & {
  description?: string | null;
};

interface FichaTecnicaFormProps {
  products: ProductOption[];
  categories: CategoryOption[];
  stones: SequenceStone[];
  chains: ChainOption[];
  wires: WireOption[];
  alloys: AlloyOption[];
  patterns: SupplyPatternOption[];
}

function normalize(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

const LINE_KINDS = ["pedra", "metal", "corrente", "fio", "outro"] as const;

const pickAttrs = (src: InsumoAttrs): InsumoAttrs => ({
  attrCut: src.attrCut ?? null,
  attrColor: src.attrColor ?? null,
  attrSizeMm: src.attrSizeMm ?? null,
  attrMaterial: src.attrMaterial ?? null,
  attrMesh: src.attrMesh ?? null,
  attrProfile: src.attrProfile ?? null,
  attrGauge: src.attrGauge ?? null,
  weightPerCm: src.weightPerCm ?? null,
  purity: src.purity ?? null,
  pureMetalName: src.pureMetalName ?? null,
  alloyMetalName: src.alloyMetalName ?? null,
});

const emptyAttrs = (): InsumoAttrs => pickAttrs({});

const PRICING_MODES: { value: PricingMode; label: string; suffix: string }[] = [
  { value: "markupPercent", label: "Lucro sobre custo (marcação %)", suffix: "%" },
  { value: "marginPercent", label: "Margem de lucro (%)", suffix: "%" },
  { value: "fixedProfit", label: "Valor fixo de lucro (R$)", suffix: "R$" },
  { value: "finalPrice", label: "Informar preço final (R$)", suffix: "R$" },
];

const COST_PRESETS: {
  label: string;
  kind: "fixed" | "percent";
  isPackaging?: boolean;
}[] = [
  { label: "Mão de Obra (Ourives)", kind: "fixed" },
  { label: "Cravação (por pedra)", kind: "fixed" },
  { label: "Banho (Ródio/Ouro)", kind: "fixed" },
  { label: "Embalagem de Luxo", kind: "fixed", isPackaging: true },
  { label: "Certificado de Garantia", kind: "fixed" },
  { label: "Taxa de Cartão", kind: "percent" },
  { label: "Comissão", kind: "percent" },
];

const lineSchema = z.object({
  libraryId: z.string().optional(),
  materialId: z.string().optional(),
  lineKind: z.enum(LINE_KINDS),
  name: z.string(),
  type: z.enum(["metal", "gema", "componente"]),
  packagePrice: z.number(),
  packageQuantity: z.number(),
  unit: z.enum(UNITS),
  quantityUsed: z.number(),
  sequenceOrder: z.number(),
  attrCut: z.string().nullish(),
  attrColor: z.string().nullish(),
  attrSizeMm: z.number().nullish(),
  attrMaterial: z.string().nullish(),
  attrMesh: z.string().nullish(),
  attrProfile: z.string().nullish(),
  attrGauge: z.number().nullish(),
  weightPerCm: z.number().nullish(),
  purity: z.number().nullish(),
  pureMetalName: z.string().nullish(),
  alloyMetalName: z.string().nullish(),
});

const costSchema = z.object({
  label: z.string(),
  kind: z.enum(["fixed", "percent"]),
  value: z.number(),
  isPackaging: z.boolean().optional(),
});

const ordemSchema = z.object({
  patternId: z.string(),
  /** Quantidade total de pedras — distribuída por round-robin nas cores. */
  totalStones: z.number(),
  sequenceOrder: z.number(),
});

const formSchema = z.object({
  productId: z.string(),
  totalWeightG: z.number().nullable(),
  pedras: z.array(lineSchema),
  metais: z.array(lineSchema),
  correntes: z.array(lineSchema),
  fios: z.array(lineSchema),
  ordens: z.array(ordemSchema),
  additionalCosts: z.array(costSchema),
  mode: z.enum(["markupPercent", "marginPercent", "fixedProfit", "finalPrice"]),
  strategyValue: z.number(),
});

type FormValues = z.infer<typeof formSchema>;
type LineValues = FormValues["pedras"][number];

const num = (value: unknown): number => {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
};

const toUnit = (value: string): Unit =>
  (UNITS as readonly string[]).includes(value) ? (value as Unit) : "un";

const toMaterialType = (value: string): MaterialType =>
  (["metal", "gema", "componente"] as const).includes(
    value as MaterialType
  )
    ? (value as MaterialType)
    : "metal";

function emptyLine(lineKind: FichaLineKind, sequenceOrder = 0): LineValues {
  const defaults: Record<
    FichaLineKind,
    Pick<LineValues, "type" | "unit" | "packageQuantity">
  > = {
    pedra: { type: "gema", unit: "un", packageQuantity: 1 },
    metal: { type: "metal", unit: "g", packageQuantity: 1 },
    corrente: { type: "componente", unit: "cm", packageQuantity: 1 },
    fio: { type: "metal", unit: "g", packageQuantity: 1 },
    outro: { type: "componente", unit: "un", packageQuantity: 1 },
  };
  const d = defaults[lineKind];
  return {
    libraryId: "",
    materialId: "",
    lineKind,
    name: "",
    type: d.type,
    packagePrice: 0,
    packageQuantity: d.packageQuantity,
    unit: d.unit,
    quantityUsed: 0,
    sequenceOrder,
    ...emptyAttrs(),
  };
}

/** Infere a categoria visual a partir de lineKind salvo ou attrs do material. */
function inferLineKind(
  lineKind: string | null | undefined,
  material: MaterialOption
): FichaLineKind {
  if (
    lineKind === "pedra" ||
    lineKind === "metal" ||
    lineKind === "corrente" ||
    lineKind === "fio"
  ) {
    return lineKind;
  }
  if (material.type === "gema") return "pedra";
  if (material.attrMesh) return "corrente";
  if (material.attrProfile) return "fio";
  if (material.type === "metal") return "metal";
  return "outro";
}

function compositionToLine(
  item: ProductOption["compositionItems"][number],
  lineKind: FichaLineKind
): LineValues {
  const m = item.material;
  return {
    libraryId: "",
    materialId: m.id,
    lineKind,
    name: m.name,
    type: toMaterialType(m.type),
    packagePrice: m.purchasePrice,
    packageQuantity: m.purchaseQuantity || 1,
    unit: toUnit(m.unit),
    quantityUsed: item.quantityUsed,
    sequenceOrder: item.sequenceOrder ?? 0,
    ...pickAttrs(m),
  };
}

/** Converte linha de fio (cm no form) para gramas na precificação/persistência. */
function resolveLineForPricing(line: LineValues): {
  name: string;
  packagePrice: number;
  packageQuantity: number;
  unit: Unit;
  quantityUsed: number;
} {
  if (
    line.lineKind === "fio" &&
    line.unit === "cm" &&
    num(line.weightPerCm) > 0
  ) {
    const cm = num(line.quantityUsed);
    const pricePerGram = num(line.packagePrice);
    const { weightG } = wireCostFromAlloy(line.weightPerCm, cm, pricePerGram);
    return {
      name: line.name ?? "",
      packagePrice: pricePerGram,
      packageQuantity: 1,
      unit: "g",
      quantityUsed: weightG,
    };
  }
  return {
    name: line.name ?? "",
    packagePrice: num(line.packagePrice),
    packageQuantity: num(line.packageQuantity) || 1,
    unit: line.unit,
    quantityUsed: num(line.quantityUsed),
  };
}

function AddLineButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <Button
      type="button"
      size="icon"
      onClick={onClick}
      aria-label={label}
      className="h-8 w-8 shrink-0 rounded-full bg-brand-600 text-white hover:bg-brand-700"
    >
      <Plus className="h-4 w-4" />
    </Button>
  );
}

export function FichaTecnicaForm({
  products,
  categories,
  stones,
  chains,
  wires,
  alloys,
  patterns,
}: FichaTecnicaFormProps) {
  const [isPending, startTransition] = useTransition();
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [categoryIds, setCategoryIds] = useState<Set<string>>(new Set());
  const [statuses, setStatuses] = useState<Set<string>>(new Set());
  const [addMenuOpen, setAddMenuOpen] = useState(false);

  const { control, register, watch, setValue, reset, getValues } =
    useForm<FormValues>({
      resolver: zodResolver(formSchema),
      defaultValues: {
        productId: "",
        totalWeightG: null,
        pedras: [],
        metais: [],
        correntes: [],
        fios: [],
        ordens: [],
        additionalCosts: [],
        mode: "markupPercent",
        strategyValue: 100,
      },
    });

  const pedrasArray = useFieldArray({ control, name: "pedras" });
  const metaisArray = useFieldArray({ control, name: "metais" });
  const correntesArray = useFieldArray({ control, name: "correntes" });
  const fiosArray = useFieldArray({ control, name: "fios" });
  const ordensArray = useFieldArray({ control, name: "ordens" });
  const costArray = useFieldArray({ control, name: "additionalCosts" });

  const values = watch();
  const selectedProduct = products.find((p) => p.id === values.productId);

  const categoryOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of products) {
      if (!p.categoryId) continue;
      counts.set(p.categoryId, (counts.get(p.categoryId) ?? 0) + 1);
    }
    return categories
      .map((c) => ({
        value: c.id,
        label: c.name,
        count: counts.get(c.id) ?? 0,
      }))
      .filter((o) => o.count > 0)
      .sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));
  }, [products, categories]);

  const statusOptions = useMemo(() => {
    let available = 0;
    let unavailable = 0;
    let withFicha = 0;
    let withoutFicha = 0;
    for (const p of products) {
      if (p.isAvailable) available += 1;
      else unavailable += 1;
      if (p.compositionItems.length > 0) withFicha += 1;
      else withoutFicha += 1;
    }
    return [
      { value: "available", label: "Disponível", count: available },
      { value: "unavailable", label: "Indisponível", count: unavailable },
      { value: "with_ficha", label: "Com ficha", count: withFicha },
      { value: "without_ficha", label: "Sem ficha", count: withoutFicha },
    ].filter((o) => o.count > 0);
  }, [products]);

  const filteredProducts = useMemo(() => {
    const q = normalize(search);
    return products.filter((p) => {
      if (categoryIds.size > 0) {
        if (!p.categoryId || !categoryIds.has(p.categoryId)) return false;
      }

      if (statuses.size > 0) {
        const availabilityKeys = [...statuses].filter(
          (s) => s === "available" || s === "unavailable"
        );
        const fichaKeys = [...statuses].filter(
          (s) => s === "with_ficha" || s === "without_ficha"
        );

        if (availabilityKeys.length > 0) {
          const key = p.isAvailable ? "available" : "unavailable";
          if (!availabilityKeys.includes(key)) return false;
        }
        if (fichaKeys.length > 0) {
          const key =
            p.compositionItems.length > 0 ? "with_ficha" : "without_ficha";
          if (!fichaKeys.includes(key)) return false;
        }
      }

      if (!q) return true;
      const haystack = normalize(
        [p.title, p.productCode ?? "", p.category?.name ?? ""].join(" ")
      );
      return haystack.includes(q);
    });
  }, [products, search, categoryIds, statuses]);

  const hasActiveFilters =
    search.trim().length > 0 || categoryIds.size > 0 || statuses.size > 0;

  function resetFilters() {
    setSearch("");
    setCategoryIds(new Set());
    setStatuses(new Set());
  }

  // Peças no select: filtradas + a selecionada (se sair do filtro, continua visível).
  const selectableProducts = useMemo(() => {
    const list = [...filteredProducts];
    if (
      selectedProduct &&
      !list.some((p) => p.id === selectedProduct.id)
    ) {
      list.unshift(selectedProduct);
    }
    return list;
  }, [filteredProducts, selectedProduct]);

  const allLines = useMemo(
    () => [
      ...values.pedras,
      ...values.metais,
      ...values.correntes,
      ...values.fios,
    ],
    [values.pedras, values.metais, values.correntes, values.fios]
  );

  const expandedFromOrdens = useMemo(() => {
    return (values.ordens ?? []).flatMap((ordem) => {
      const pattern = patterns.find((p) => p.id === ordem.patternId);
      if (!pattern) return [];
      const total = Math.max(0, Math.floor(num(ordem.totalStones)));
      const hasNonStone = pattern.items.some((i) => i.itemKind !== "pedra");
      if (total <= 0 && !hasNonStone) return [];
      return expandPattern(pattern, total);
    });
  }, [values.ordens, patterns]);

  const result = useMemo(() => {
    const patternMaterials = expandedFromOrdens.map((leaf) => ({
      name: leaf.name,
      packagePrice: leaf.packagePrice,
      packageQuantity: leaf.packageQuantity,
      unit: leaf.unit,
      quantityUsed: leaf.quantityUsed,
    }));
    const input: PricingInput = {
      materials: [
        ...allLines.map((line) => resolveLineForPricing(line)),
        ...patternMaterials,
      ],
      additionalCosts: values.additionalCosts.map((cost) => ({
        label: cost.label,
        kind: cost.kind,
        value: num(cost.value),
        isPackaging: cost.isPackaging,
      })),
      mode: values.mode,
      strategyValue: num(values.strategyValue),
    };
    return computePricing(input);
  }, [
    allLines,
    expandedFromOrdens,
    values.additionalCosts,
    values.mode,
    values.strategyValue,
  ]);

  const selectedMode = PRICING_MODES.find((m) => m.value === values.mode);

  function handleSelectProduct(productId: string) {
    setSaveMessage(null);
    setSaveError(null);

    if (!productId) {
      reset({
        productId: "",
        totalWeightG: null,
        pedras: [],
        metais: [],
        correntes: [],
        fios: [],
        ordens: [],
        additionalCosts: getValues("additionalCosts"),
        mode: "markupPercent",
        strategyValue: 100,
      });
      return;
    }

    const product = products.find((p) => p.id === productId);
    if (!product) return;

    const pedras: LineValues[] = [];
    const metais: LineValues[] = [];
    const correntes: LineValues[] = [];
    const fios: LineValues[] = [];
    const ordens: FormValues["ordens"] = [];

    const sorted = [...product.compositionItems].sort(
      (a, b) => (a.sequenceOrder ?? 0) - (b.sequenceOrder ?? 0)
    );

    // Agrupa folhas que vieram de Ordem (snapshot) → uma linha de ordem no form.
    const patternGroups = new Map<
      string,
      { name: string; totalStones: number; minOrder: number }
    >();

    for (const item of sorted) {
      if (item.sourcePatternId) {
        const prev = patternGroups.get(item.sourcePatternId);
        const totalStones =
          item.patternQty && item.patternQty > 0 ? item.patternQty : 0;
        if (!prev) {
          patternGroups.set(item.sourcePatternId, {
            name: item.sourcePattern?.name ?? "Ordem",
            totalStones,
            minOrder: item.sequenceOrder ?? 0,
          });
        } else {
          prev.minOrder = Math.min(prev.minOrder, item.sequenceOrder ?? 0);
          // Preferir o snapshot patternQty; se faltar, somar pedras.
          if (prev.totalStones <= 0 && item.lineKind === "pedra") {
            prev.totalStones += item.quantityUsed;
          } else if (
            item.patternQty &&
            item.patternQty > prev.totalStones
          ) {
            prev.totalStones = item.patternQty;
          }
        }
        continue;
      }

      const kind = inferLineKind(item.lineKind, item.material);
      const line = compositionToLine(item, kind === "outro" ? "metal" : kind);
      if (kind === "pedra") pedras.push(line);
      else if (kind === "corrente") correntes.push(line);
      else if (kind === "fio") fios.push(line);
      else metais.push({ ...line, lineKind: kind === "outro" ? "metal" : kind });
    }

    [...patternGroups.entries()]
      .sort((a, b) => a[1].minOrder - b[1].minOrder)
      .forEach(([patternId, meta], i) => {
        // Só reidrata se a Ordem ainda existir na biblioteca (ativa).
        if (patterns.some((p) => p.id === patternId)) {
          ordens.push({
            patternId,
            totalStones: meta.totalStones > 0 ? meta.totalStones : 0,
            sequenceOrder: i,
          });
        } else {
          // Ordem apagada: folhas reabertas como avulsos abaixo.
        }
      });

    // Se alguma Ordem sumiu, reidrata as folhas dela como avulsos.
    for (const item of sorted) {
      if (
        item.sourcePatternId &&
        !patterns.some((p) => p.id === item.sourcePatternId)
      ) {
        const kind = inferLineKind(item.lineKind, item.material);
        const line = compositionToLine(item, kind === "outro" ? "metal" : kind);
        if (kind === "pedra") pedras.push(line);
        else if (kind === "corrente") correntes.push(line);
        else if (kind === "fio") fios.push(line);
        else metais.push({ ...line, lineKind: "metal" });
      }
    }

    pedras.forEach((p, i) => {
      p.sequenceOrder = i;
    });

    reset({
      productId,
      totalWeightG: product.totalWeightG,
      pedras,
      metais,
      correntes,
      fios,
      ordens,
      additionalCosts: getValues("additionalCosts"),
      mode: (product.pricingStrategy as PricingMode) ?? "markupPercent",
      strategyValue: product.pricingValue ?? 100,
    });
  }

  function applyStone(index: number, stoneId: string) {
    const stone = stones.find((s) => s.id === stoneId);
    if (!stone) return;
    const name = [stone.name, stone.cut, stone.color, stone.sizeMm != null ? `${stone.sizeMm}mm` : null]
      .filter(Boolean)
      .join(" · ");
    setValue(`pedras.${index}.libraryId`, stone.id);
    setValue(`pedras.${index}.name`, name);
    setValue(`pedras.${index}.type`, "gema");
    setValue(`pedras.${index}.packagePrice`, stone.unitPrice);
    setValue(`pedras.${index}.packageQuantity`, 1);
    setValue(`pedras.${index}.unit`, "un");
    setValue(`pedras.${index}.attrCut`, stone.cut?.trim() || null);
    setValue(`pedras.${index}.attrColor`, stone.color?.trim() || null);
    setValue(`pedras.${index}.attrSizeMm`, stone.sizeMm ?? null);
    if (num(getValues(`pedras.${index}.quantityUsed`)) <= 0) {
      setValue(`pedras.${index}.quantityUsed`, 1);
    }
  }

  function applyAlloy(index: number, alloyId: string) {
    const alloy = alloys.find((a) => a.id === alloyId);
    if (!alloy) return;
    setValue(`metais.${index}.libraryId`, alloy.id);
    setValue(`metais.${index}.name`, alloy.name);
    setValue(`metais.${index}.type`, "metal");
    setValue(`metais.${index}.packagePrice`, alloy.pricePerGram);
    setValue(`metais.${index}.packageQuantity`, 1);
    setValue(`metais.${index}.unit`, "g");
    setValue(`metais.${index}.attrMaterial`, alloy.name);
    setValue(`metais.${index}.purity`, alloy.purity);
    setValue(`metais.${index}.pureMetalName`, alloy.pureMetalName);
    setValue(`metais.${index}.alloyMetalName`, alloy.alloyMetalName);
  }

  function applyChain(index: number, chainId: string) {
    const chain = chains.find((c) => c.id === chainId);
    if (!chain) return;
    setValue(`correntes.${index}.libraryId`, chain.id);
    setValue(`correntes.${index}.name`, chain.name);
    setValue(`correntes.${index}.type`, "componente");
    setValue(`correntes.${index}.packagePrice`, chain.pricePerCm);
    setValue(`correntes.${index}.packageQuantity`, 1);
    setValue(`correntes.${index}.unit`, "cm");
    setValue(`correntes.${index}.weightPerCm`, chain.weightPerCm);
    setValue(`correntes.${index}.attrMesh`, chain.mesh);
    setValue(`correntes.${index}.attrMaterial`, chain.material);
    setValue(`correntes.${index}.attrSizeMm`, chain.thicknessMm);
  }

  function applyWire(index: number, wireId: string) {
    const wire = wires.find((w) => w.id === wireId);
    if (!wire) return;
    const pricePerGram = wire.alloy?.pricePerGram ?? 0;
    // No form, quantityUsed de fio = cm; na precificação/save convertemos para g.
    setValue(`fios.${index}.libraryId`, wire.id);
    setValue(`fios.${index}.name`, wire.name);
    setValue(`fios.${index}.type`, "metal");
    setValue(`fios.${index}.packagePrice`, pricePerGram || wire.pricePerCm);
    setValue(`fios.${index}.packageQuantity`, 1);
    setValue(`fios.${index}.unit`, "cm");
    setValue(`fios.${index}.weightPerCm`, wire.weightPerCm);
    setValue(`fios.${index}.attrProfile`, wire.profile);
    setValue(`fios.${index}.attrMaterial`, wire.alloy?.name ?? wire.material);
    setValue(`fios.${index}.attrGauge`, wire.gauge);
  }

  function reindexPedras() {
    const current = getValues("pedras");
    current.forEach((_, i) => {
      setValue(`pedras.${i}.sequenceOrder`, i);
    });
  }

  function movePedra(from: number, direction: -1 | 1) {
    const to = from + direction;
    if (to < 0 || to >= pedrasArray.fields.length) return;
    pedrasArray.move(from, to);
    // move é sync no RHF; reindex no próximo tick via getValues após move.
    queueMicrotask(reindexPedras);
  }

  function handleSave() {
    setSaveMessage(null);
    setSaveError(null);

    const current = getValues();
    if (!current.productId) {
      setSaveError("Selecione uma peça existente para salvar a ficha.");
      return;
    }

    // Garante sequenceOrder das pedras antes do flatten.
    const pedras = current.pedras.map((line, i) => ({
      ...line,
      sequenceOrder: i,
      lineKind: "pedra" as const,
    }));
    const metais = current.metais.map((line, i) => ({
      ...line,
      sequenceOrder: i,
      lineKind: "metal" as const,
    }));
    const correntes = current.correntes.map((line, i) => ({
      ...line,
      sequenceOrder: i,
      lineKind: "corrente" as const,
    }));
    const fios = current.fios.map((line, i) => ({
      ...line,
      sequenceOrder: i,
      lineKind: "fio" as const,
    }));

    const flat = [...pedras, ...metais, ...correntes, ...fios];

    const payload: SaveFichaInput = {
      productId: current.productId,
      mode: current.mode,
      strategyValue: num(current.strategyValue),
      sellingPrice: result.sellingPrice,
      totalCost: result.totalCost,
      totalWeightG: current.totalWeightG,
      materials: flat
        .filter((line) => {
          const resolved = resolveLineForPricing(line);
          return line.name.trim() && resolved.quantityUsed > 0;
        })
        .map((line) => {
          const resolved = resolveLineForPricing(line);
          return {
            materialId: line.materialId || undefined,
            name: line.name.trim(),
            type: line.type,
            packagePrice: resolved.packagePrice,
            packageQuantity: resolved.packageQuantity,
            unit: resolved.unit,
            quantityUsed: resolved.quantityUsed,
            sequenceOrder: line.sequenceOrder,
            lineKind: line.lineKind,
            ...pickAttrs(line),
          };
        }),
      patternsApplied: (current.ordens ?? [])
        .filter((o) => o.patternId)
        .map((o, i) => ({
          patternId: o.patternId,
          totalStones: Math.max(0, Math.floor(num(o.totalStones))),
          sequenceOrder: i,
        })),
    };

    startTransition(async () => {
      const res = await saveFichaTecnica(payload);
      if (res.error) {
        setSaveError(res.error);
        return;
      }
      setSaveMessage("Ficha técnica salva! Preço e custo da peça atualizados.");
    });
  }

  return (
    <div className="space-y-6">
      {/* Filtros + select peça + salvar */}
      <Card className="overflow-hidden border-brand-100 p-0">
        <DataTableToolbar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Buscar peça por nome ou código..."
          hasActiveFilters={hasActiveFilters}
          onReset={resetFilters}
          resultCount={filteredProducts.length}
          totalCount={products.length}
          className="border-brand-100/60 bg-brand-50/30"
        >
          <DataTableFacetedFilter
            title="Categoria"
            options={categoryOptions}
            selected={categoryIds}
            onSelectedChange={setCategoryIds}
          />
          <DataTableFacetedFilter
            title="Status"
            options={statusOptions}
            selected={statuses}
            onSelectedChange={setStatuses}
          />
        </DataTableToolbar>

        <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-1.5">
            <Label className="text-xs">Peça do catálogo</Label>
            <Controller
              control={control}
              name="productId"
              render={({ field }) => (
                <Select
                  value={field.value || "__none__"}
                  onValueChange={(value) => {
                    const id = value === "__none__" ? "" : value;
                    field.onChange(id);
                    handleSelectProduct(id);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma peça..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Selecione uma peça...</SelectItem>
                    {selectableProducts.length === 0 ? (
                      <SelectItem value="__empty__" disabled>
                        Nenhuma peça com esses filtros
                      </SelectItem>
                    ) : (
                      selectableProducts.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.title}
                          {product.productCode
                            ? ` · ${product.productCode}`
                            : ""}
                          {product.category?.name
                            ? ` · ${product.category.name}`
                            : ""}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Button
              type="button"
              onClick={handleSave}
              disabled={isPending || !values.productId}
              className="bg-brand-600 text-white hover:bg-brand-700"
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Salvar ficha técnica
            </Button>
            {saveMessage && (
              <p className="flex items-center gap-1.5 text-xs text-green-700">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {saveMessage}
              </p>
            )}
            {saveError && <p className="text-xs text-red-600">{saveError}</p>}
          </div>
        </CardContent>
      </Card>

      {!values.productId ? (
        <p className="rounded-xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center text-sm text-slate-400">
          Selecione uma peça para abrir o formulário estruturado da ficha
          técnica.
        </p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          {/* Foto sticky */}
          <aside className="lg:sticky lg:top-4 lg:self-start">
            <div className="overflow-hidden rounded-xl border border-brand-100 bg-white shadow-sm">
              <div className="relative aspect-[4/5] bg-slate-50">
                {selectedProduct?.imageUrl ? (
                  <Image
                    src={selectedProduct.imageUrl}
                    alt={selectedProduct.title}
                    fill
                    className="object-cover"
                    sizes="280px"
                    unoptimized
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-slate-400">
                    Sem foto
                  </div>
                )}
              </div>
              <div className="space-y-1 border-t border-slate-100 p-3">
                <p className="font-serif text-lg font-semibold text-slate-900">
                  {selectedProduct?.title}
                </p>
                {selectedProduct?.productCode && (
                  <p className="text-xs text-slate-500">
                    Cód. {selectedProduct.productCode}
                  </p>
                )}
              </div>
            </div>
          </aside>

          {/* Formulário principal */}
          <div className="space-y-4">
            {/* Campos fixos */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-slate-900">
                  Identificação da peça
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="space-y-1">
                  <Label className="text-xs">Nome</Label>
                  <Input
                    value={selectedProduct?.title ?? ""}
                    readOnly
                    className="h-9 bg-slate-50"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Código</Label>
                  <Input
                    value={selectedProduct?.productCode ?? "—"}
                    readOnly
                    className="h-9 bg-slate-50"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Peso total (g)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min={0}
                    className="h-9"
                    {...register("totalWeightG", {
                      setValueAs: (v) => {
                        if (v === "" || v === null || v === undefined) return null;
                        const n = Number(v);
                        return Number.isFinite(n) ? n : null;
                      },
                    })}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Menu flexível de adição */}
            <div className="flex flex-wrap items-center gap-2">
              <Popover open={addMenuOpen} onOpenChange={setAddMenuOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    className="bg-brand-600 text-white hover:bg-brand-700"
                  >
                    <Plus className="h-4 w-4" />
                    Adicionar à ficha
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-56 p-1">
                  {(
                    [
                      {
                        label: "Adicionar Metal",
                        icon: Sparkles,
                        action: () =>
                          metaisArray.append(
                            emptyLine("metal", metaisArray.fields.length)
                          ),
                      },
                      {
                        label: "Adicionar Corrente",
                        icon: Link2,
                        action: () =>
                          correntesArray.append(
                            emptyLine("corrente", correntesArray.fields.length)
                          ),
                      },
                      {
                        label: "Adicionar Fio",
                        icon: Waves,
                        action: () =>
                          fiosArray.append(
                            emptyLine("fio", fiosArray.fields.length)
                          ),
                      },
                      {
                        label: "Adicionar Ordem Cadastrada",
                        icon: ClipboardList,
                        action: () =>
                          ordensArray.append({
                            patternId: patterns[0]?.id ?? "",
                            totalStones: 0,
                            sequenceOrder: ordensArray.fields.length,
                          }),
                      },
                    ] as const
                  ).map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-slate-700 hover:bg-brand-50 hover:text-brand-900"
                      onClick={() => {
                        item.action();
                        setAddMenuOpen(false);
                      }}
                    >
                      <item.icon className="h-4 w-4 text-brand-700" />
                      {item.label}
                    </button>
                  ))}
                </PopoverContent>
              </Popover>
              <p className="text-xs text-slate-400">
                Pedras entram só via Ordem — informe a quantidade total e o
                sistema distribui as cores (round-robin).
              </p>
            </div>

            {/* Ordens cadastradas */}
            {(ordensArray.fields.length > 0 || patterns.length > 0) && (
              <Card className="border-brand-100">
                <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
                  <CardTitle className="flex items-center gap-2 text-base text-slate-900">
                    <ClipboardList className="h-4 w-4 text-brand-700" />
                    Ordens de pedras
                  </CardTitle>
                  <AddLineButton
                    label="Adicionar ordem"
                    onClick={() =>
                      ordensArray.append({
                        patternId: patterns[0]?.id ?? "",
                        totalStones: 0,
                        sequenceOrder: ordensArray.fields.length,
                      })
                    }
                  />
                </CardHeader>
                <CardContent className="space-y-3">
                  {patterns.length === 0 && (
                    <p className="text-sm text-slate-400">
                      Cadastre ordens em Insumos → Ordens para usá-las aqui.
                    </p>
                  )}
                  {ordensArray.fields.map((field, index) => {
                    const ordem = values.ordens?.[index];
                    const pattern = patterns.find(
                      (p) => p.id === ordem?.patternId
                    );
                    const totalStones = Math.max(
                      0,
                      Math.floor(num(ordem?.totalStones))
                    );
                    const stonePreview = pattern
                      ? distributePatternStones(pattern, totalStones)
                      : [];
                    const colorCount = stonePreview.length;
                    const otherLeaves = pattern
                      ? expandPattern(pattern, totalStones).filter(
                          (l) => l.lineKind !== "pedra"
                        )
                      : [];

                    return (
                      <div
                        key={field.id}
                        className="space-y-2 rounded-lg border border-brand-100 bg-brand-50/30 p-3"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-medium text-brand-800">
                            Ordem {index + 1}
                          </span>
                          <div className="flex gap-1">
                            <button
                              type="button"
                              disabled={index === 0}
                              onClick={() =>
                                ordensArray.move(index, index - 1)
                              }
                              className="rounded p-1 text-slate-500 hover:bg-white disabled:opacity-30"
                              aria-label="Subir ordem"
                            >
                              <ArrowUp className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              disabled={
                                index === ordensArray.fields.length - 1
                              }
                              onClick={() =>
                                ordensArray.move(index, index + 1)
                              }
                              className="rounded p-1 text-slate-500 hover:bg-white disabled:opacity-30"
                              aria-label="Descer ordem"
                            >
                              <ArrowDown className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => ordensArray.remove(index)}
                              className="rounded p-1 text-red-500 hover:bg-red-50"
                              aria-label="Remover ordem"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_8rem]">
                          <div className="space-y-1">
                            <Label className="text-xs">Ordem cadastrada</Label>
                            <Controller
                              control={control}
                              name={`ordens.${index}.patternId`}
                              render={({ field: idField }) => (
                                <Select
                                  value={idField.value || undefined}
                                  onValueChange={idField.onChange}
                                >
                                  <SelectTrigger className="h-9">
                                    <SelectValue placeholder="Selecione a ordem..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {patterns.map((p) => {
                                      const stonesInPattern = p.items.filter(
                                        (i) => i.itemKind === "pedra"
                                      ).length;
                                      return (
                                        <SelectItem key={p.id} value={p.id}>
                                          {p.name}
                                          {stonesInPattern > 0
                                            ? ` · ${stonesInPattern} cor${stonesInPattern === 1 ? "" : "es"}`
                                            : ""}
                                        </SelectItem>
                                      );
                                    })}
                                  </SelectContent>
                                </Select>
                              )}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">
                              Qtd total de pedras
                            </Label>
                            <Input
                              type="number"
                              step="1"
                              min={0}
                              className="h-9"
                              {...register(`ordens.${index}.totalStones`, {
                                valueAsNumber: true,
                              })}
                            />
                          </div>
                        </div>

                        {pattern && colorCount > 0 && (
                          <div className="overflow-hidden rounded-md border border-brand-100 bg-white">
                            <div className="border-b border-brand-50 bg-brand-50/50 px-3 py-1.5 text-xs font-medium text-brand-800">
                              Distribuição ({totalStones} pedras ÷ {colorCount}{" "}
                              cores)
                              {totalStones > 0 && colorCount > 0
                                ? ` → base ${Math.floor(totalStones / colorCount)}, resto ${totalStones % colorCount}`
                                : ""}
                            </div>
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="border-b border-slate-100 text-left text-slate-400">
                                  <th className="px-3 py-1.5 font-medium">#</th>
                                  <th className="px-3 py-1.5 font-medium">
                                    Pedra / cor
                                  </th>
                                  <th className="px-3 py-1.5 text-right font-medium">
                                    Qtd
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {stonePreview.map((row, i) => (
                                  <tr
                                    key={`${row.stoneId}-${i}`}
                                    className="border-b border-slate-50 last:border-0"
                                  >
                                    <td className="px-3 py-1.5 text-slate-400">
                                      {i + 1}
                                    </td>
                                    <td className="px-3 py-1.5 text-slate-700">
                                      {row.name}
                                    </td>
                                    <td className="px-3 py-1.5 text-right font-semibold text-brand-800">
                                      {row.count}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}

                        {otherLeaves.length > 0 && (
                          <ul className="space-y-0.5 px-1 text-[11px] text-slate-500">
                            {otherLeaves.map((leaf, i) => (
                              <li key={`${leaf.name}-o-${i}`}>
                                +{" "}
                                {leaf.quantityUsed.toLocaleString("pt-BR", {
                                  maximumFractionDigits: 3,
                                })}{" "}
                                {leaf.unit} · {leaf.name}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            )}

            {/* Pedras legadas (só se ordem antiga foi apagada) */}
            {pedrasArray.fields.length > 0 && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
                <CardTitle className="flex items-center gap-2 text-base text-slate-900">
                  <Gem className="h-4 w-4 text-brand-700" />
                  Pedras (legado — ordem removida)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-amber-700">
                  Estas pedras vieram de uma ordem que não existe mais. Salve a
                  ficha com uma nova ordem para normalizar.
                </p>
                {pedrasArray.fields.map((field, index) => (
                  <div
                    key={field.id}
                    className="space-y-2 rounded-lg border border-slate-200 p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-slate-400">
                        Ordem {index + 1}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          aria-label="Subir pedra"
                          disabled={index === 0}
                          onClick={() => movePedra(index, -1)}
                          className="rounded p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-30"
                        >
                          <ArrowUp className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          aria-label="Descer pedra"
                          disabled={index === pedrasArray.fields.length - 1}
                          onClick={() => movePedra(index, 1)}
                          className="rounded p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-30"
                        >
                          <ArrowDown className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          aria-label="Remover pedra"
                          onClick={() => {
                            pedrasArray.remove(index);
                            queueMicrotask(reindexPedras);
                          }}
                          className="rounded p-1 text-red-500 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_6rem]">
                      <div className="space-y-1">
                        <Label className="text-xs">Pedra (biblioteca)</Label>
                        <Controller
                          control={control}
                          name={`pedras.${index}.libraryId`}
                          render={({ field: libField }) => (
                            <Select
                              value={libField.value || "__custom__"}
                              onValueChange={(v) => {
                                if (v === "__custom__") {
                                  libField.onChange("");
                                  return;
                                }
                                libField.onChange(v);
                                applyStone(index, v);
                              }}
                            >
                              <SelectTrigger className="h-9">
                                <SelectValue placeholder="Selecione..." />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__custom__">
                                  Avulso / já carregado
                                </SelectItem>
                                {stones.map((s) => (
                                  <SelectItem key={s.id} value={s.id}>
                                    {[s.name, s.cut, s.color, s.sizeMm != null ? `${s.sizeMm}mm` : null]
                                      .filter(Boolean)
                                      .join(" · ")}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Qtd (un)</Label>
                        <Input
                          type="number"
                          step="1"
                          min={0}
                          className="h-9"
                          {...register(`pedras.${index}.quantityUsed`, {
                            valueAsNumber: true,
                          })}
                        />
                      </div>
                    </div>
                    <Input
                      {...register(`pedras.${index}.name`)}
                      placeholder="Nome da pedra"
                      className="h-8 text-xs"
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
            )}

            {/* Metais */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
                <CardTitle className="flex items-center gap-2 text-base text-slate-900">
                  <Sparkles className="h-4 w-4 text-brand-700" />
                  Metais (Ouro / Prata)
                </CardTitle>
                <AddLineButton
                  label="Adicionar metal"
                  onClick={() =>
                    metaisArray.append(emptyLine("metal", metaisArray.fields.length))
                  }
                />
              </CardHeader>
              <CardContent className="space-y-3">
                {metaisArray.fields.length === 0 && (
                  <p className="text-sm text-slate-400">
                    Nenhum metal. Use o botão + para adicionar.
                  </p>
                )}
                {metaisArray.fields.map((field, index) => (
                  <div
                    key={field.id}
                    className="space-y-2 rounded-lg border border-slate-200 p-3"
                  >
                    <div className="flex justify-end">
                      <button
                        type="button"
                        aria-label="Remover metal"
                        onClick={() => metaisArray.remove(index)}
                        className="rounded p-1 text-red-500 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_6rem]">
                      <div className="space-y-1">
                        <Label className="text-xs">Liga</Label>
                        <Controller
                          control={control}
                          name={`metais.${index}.libraryId`}
                          render={({ field: libField }) => (
                            <Select
                              value={libField.value || "__custom__"}
                              onValueChange={(v) => {
                                if (v === "__custom__") {
                                  libField.onChange("");
                                  return;
                                }
                                libField.onChange(v);
                                applyAlloy(index, v);
                              }}
                            >
                              <SelectTrigger className="h-9">
                                <SelectValue placeholder="Selecione a liga..." />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__custom__">
                                  Avulso / já carregado
                                </SelectItem>
                                {alloys.map((a) => (
                                  <SelectItem key={a.id} value={a.id}>
                                    {a.name} — R$ {a.pricePerGram.toFixed(2)}/g
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Peso (g)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min={0}
                          className="h-9"
                          {...register(`metais.${index}.quantityUsed`, {
                            valueAsNumber: true,
                          })}
                        />
                      </div>
                    </div>
                    <Input
                      {...register(`metais.${index}.name`)}
                      placeholder="Nome do metal/liga"
                      className="h-8 text-xs"
                    />
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Correntes */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
                <CardTitle className="flex items-center gap-2 text-base text-slate-900">
                  <Link2 className="h-4 w-4 text-brand-700" />
                  Correntes
                </CardTitle>
                <AddLineButton
                  label="Adicionar corrente"
                  onClick={() =>
                    correntesArray.append(
                      emptyLine("corrente", correntesArray.fields.length)
                    )
                  }
                />
              </CardHeader>
              <CardContent className="space-y-3">
                {correntesArray.fields.length === 0 && (
                  <p className="text-sm text-slate-400">
                    Nenhuma corrente. Use o botão + para adicionar.
                  </p>
                )}
                {correntesArray.fields.map((field, index) => (
                  <div
                    key={field.id}
                    className="space-y-2 rounded-lg border border-slate-200 p-3"
                  >
                    <div className="flex justify-end">
                      <button
                        type="button"
                        aria-label="Remover corrente"
                        onClick={() => correntesArray.remove(index)}
                        className="rounded p-1 text-red-500 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_6rem]">
                      <div className="space-y-1">
                        <Label className="text-xs">Corrente</Label>
                        <Controller
                          control={control}
                          name={`correntes.${index}.libraryId`}
                          render={({ field: libField }) => (
                            <Select
                              value={libField.value || "__custom__"}
                              onValueChange={(v) => {
                                if (v === "__custom__") {
                                  libField.onChange("");
                                  return;
                                }
                                libField.onChange(v);
                                applyChain(index, v);
                              }}
                            >
                              <SelectTrigger className="h-9">
                                <SelectValue placeholder="Selecione..." />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__custom__">
                                  Avulso / já carregado
                                </SelectItem>
                                {chains.map((c) => (
                                  <SelectItem key={c.id} value={c.id}>
                                    {c.name} ({c.mesh})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Comp. (cm)</Label>
                        <Input
                          type="number"
                          step="0.1"
                          min={0}
                          className="h-9"
                          {...register(`correntes.${index}.quantityUsed`, {
                            valueAsNumber: true,
                          })}
                        />
                      </div>
                    </div>
                    <Input
                      {...register(`correntes.${index}.name`)}
                      placeholder="Nome da corrente"
                      className="h-8 text-xs"
                    />
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Fios */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
                <CardTitle className="flex items-center gap-2 text-base text-slate-900">
                  <Waves className="h-4 w-4 text-brand-700" />
                  Fios
                </CardTitle>
                <AddLineButton
                  label="Adicionar fio"
                  onClick={() =>
                    fiosArray.append(emptyLine("fio", fiosArray.fields.length))
                  }
                />
              </CardHeader>
              <CardContent className="space-y-3">
                {fiosArray.fields.length === 0 && (
                  <p className="text-sm text-slate-400">
                    Nenhum fio. Use o botão + — custo herda o R$/g da liga.
                  </p>
                )}
                {fiosArray.fields.map((field, index) => {
                  const line = values.fios[index];
                  const wpc = num(line?.weightPerCm);
                  const qty = num(line?.quantityUsed);
                  const unit = line?.unit;
                  // Dados antigos vêm em g; exibe cm equivalente se possível.
                  const displayCm =
                    unit === "g" && wpc > 0 ? qty / wpc : qty;
                  const resolved = line
                    ? resolveLineForPricing({ ...line, lineKind: "fio" })
                    : null;
                  const hintParts: string[] = [];
                  if (wpc > 0 && (unit === "cm" || unit === "g")) {
                    hintParts.push(
                      `→ ${resolved?.quantityUsed.toFixed(3) ?? "0"} g`
                    );
                  }
                  if (line?.attrMaterial) {
                    hintParts.push(
                      `${line.attrMaterial} · R$ ${num(line.packagePrice).toFixed(2)}/g`
                    );
                  }

                  return (
                    <div
                      key={field.id}
                      className="space-y-2 rounded-lg border border-slate-200 p-3"
                    >
                      <div className="flex justify-end">
                        <button
                          type="button"
                          aria-label="Remover fio"
                          onClick={() => fiosArray.remove(index)}
                          className="rounded p-1 text-red-500 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_6rem]">
                        <div className="space-y-1">
                          <Label className="text-xs">Fio</Label>
                          <Controller
                            control={control}
                            name={`fios.${index}.libraryId`}
                            render={({ field: libField }) => (
                              <Select
                                value={libField.value || "__custom__"}
                                onValueChange={(v) => {
                                  if (v === "__custom__") {
                                    libField.onChange("");
                                    return;
                                  }
                                  libField.onChange(v);
                                  applyWire(index, v);
                                }}
                              >
                                <SelectTrigger className="h-9">
                                  <SelectValue placeholder="Selecione..." />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="__custom__">
                                    Avulso / já carregado
                                  </SelectItem>
                                  {wires.map((w) => (
                                    <SelectItem key={w.id} value={w.id}>
                                      {w.name}
                                      {w.alloy
                                        ? ` (${w.alloy.name})`
                                        : ""}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">
                            {unit === "g" && !line?.libraryId
                              ? "Peso (g)"
                              : "Comp. (cm)"}
                          </Label>
                          <Input
                            type="number"
                            step="0.01"
                            min={0}
                            className="h-9"
                            value={
                              Number.isFinite(displayCm) ? displayCm : 0
                            }
                            onChange={(e) => {
                              const raw = Number(e.target.value);
                              const cm = Number.isFinite(raw) ? raw : 0;
                              // Edição sempre em cm quando há weightPerCm.
                              if (wpc > 0) {
                                setValue(`fios.${index}.unit`, "cm");
                                setValue(`fios.${index}.quantityUsed`, cm);
                              } else {
                                setValue(`fios.${index}.quantityUsed`, cm);
                              }
                            }}
                          />
                        </div>
                      </div>
                      {hintParts.length > 0 && (
                        <p className="text-[11px] text-slate-400">
                          {hintParts.join(" · ")}
                        </p>
                      )}
                      <Input
                        {...register(`fios.${index}.name`)}
                        placeholder="Nome do fio"
                        className="h-8 text-xs"
                      />
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Custos adicionais */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-slate-900">
                  Custos adicionais
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {COST_PRESETS.map((preset) => (
                    <Button
                      key={preset.label}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        costArray.append({
                          label: preset.label,
                          kind: preset.kind,
                          value: 0,
                          isPackaging: preset.isPackaging,
                        })
                      }
                    >
                      <Plus className="h-3.5 w-3.5" />
                      {preset.label}
                    </Button>
                  ))}
                </div>
                {costArray.fields.map((field, index) => (
                  <div key={field.id} className="flex items-end gap-2">
                    <div className="flex-1 space-y-1">
                      <Label className="text-xs">Descrição</Label>
                      <Input
                        {...register(`additionalCosts.${index}.label`)}
                        className="h-8"
                      />
                    </div>
                    <div className="w-24 space-y-1">
                      <Label className="text-xs">Tipo</Label>
                      <Controller
                        control={control}
                        name={`additionalCosts.${index}.kind`}
                        render={({ field: kindField }) => (
                          <Select
                            value={kindField.value}
                            onValueChange={kindField.onChange}
                          >
                            <SelectTrigger className="h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="fixed">R$</SelectItem>
                              <SelectItem value="percent">%</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>
                    <div className="w-24 space-y-1">
                      <Label className="text-xs">Valor</Label>
                      <Input
                        type="number"
                        step="0.01"
                        {...register(`additionalCosts.${index}.value`, {
                          valueAsNumber: true,
                        })}
                        className="h-8"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => costArray.remove(index)}
                      aria-label="Remover custo"
                      className="mb-1 rounded p-1.5 text-red-500 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Estratégia */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-slate-900">
                  Estratégia de precificação
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-xs">Como calcular</Label>
                  <Controller
                    control={control}
                    name="mode"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PRICING_MODES.map((mode) => (
                            <SelectItem key={mode.value} value={mode.value}>
                              {mode.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">
                    Valor ({selectedMode?.suffix})
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    {...register("strategyValue", { valueAsNumber: true })}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Resultados */}
            <FichaResults result={result} />
          </div>
        </div>
      )}
    </div>
  );
}
