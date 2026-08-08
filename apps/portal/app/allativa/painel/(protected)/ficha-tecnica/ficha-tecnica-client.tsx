"use client";

import { useMemo, useState, useTransition } from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CheckCircle2, Loader2, Plus, Save, Trash2 } from "lucide-react";

import {
  saveFichaTecnica,
  type SaveFichaInput,
} from "@/app/allativa/painel/ficha-tecnica/actions";
import {
  computePricing,
  MATERIAL_TYPES,
  UNITS,
  type MaterialType,
  type PricingInput,
  type PricingMode,
  type Unit,
} from "@allativa/lib/pricing";
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
  AlloyBuilder,
  StoneSequencer,
  WireChainBuilder,
  type AlloyOption,
  type ChainOption,
  type DraftLine,
  type WireOption,
} from "@allativa/components/admin/piece-builders";
import type { SequenceStone } from "@allativa/lib/jewelry-math";
import type { InsumoAttrs } from "@allativa/lib/material-requisition";
import { FichaResults } from "./ficha-results";

type MaterialOption = {
  id: string;
  name: string;
  type: string;
  purchasePrice: number;
  purchaseQuantity: number;
  unit: string;
} & InsumoAttrs;

type ProductOption = {
  id: string;
  title: string;
  price: number;
  pricingStrategy: string | null;
  pricingValue: number | null;
  compositionItems: {
    quantityUsed: number;
    material: MaterialOption;
  }[];
};

interface FichaTecnicaClientProps {
  products: ProductOption[];
  materials: MaterialOption[];
  stones: SequenceStone[];
  chains: ChainOption[];
  wires: WireOption[];
  alloys: AlloyOption[];
}

// Extrai apenas os metadados estruturados (para round-trip e requisição).
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

const CUSTOM_MATERIAL = "__custom__";

// Rótulos e unidade sugerida por tipo de material da ourivesaria.
const MATERIAL_TYPE_META: Record<
  MaterialType,
  { label: string; suggestedUnit: Unit }
> = {
  metal: { label: "Metal (Ouro/Prata)", suggestedUnit: "g" },
  gema: { label: "Gema / Pedra", suggestedUnit: "ct" },
  componente: { label: "Componente (Fecho/Corrente)", suggestedUnit: "un" },
};

const PRICING_MODES: { value: PricingMode; label: string; suffix: string }[] = [
  { value: "markupPercent", label: "Lucro sobre custo (marcação %)", suffix: "%" },
  { value: "marginPercent", label: "Margem de lucro (%)", suffix: "%" },
  { value: "fixedProfit", label: "Valor fixo de lucro (R$)", suffix: "R$" },
  { value: "finalPrice", label: "Informar preço final (R$)", suffix: "R$" },
];

// Custos adicionais típicos da ourivesaria.
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

const materialSchema = z.object({
  materialId: z.string().optional(),
  name: z.string(),
  type: z.enum(MATERIAL_TYPES),
  packagePrice: z.number(),
  packageQuantity: z.number(),
  unit: z.enum(UNITS),
  quantityUsed: z.number(),
  // Metadados estruturados (opcionais) — alimentam a Requisição de Materiais.
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

const formSchema = z.object({
  productId: z.string(),
  materials: z.array(materialSchema),
  additionalCosts: z.array(costSchema),
  mode: z.enum(["markupPercent", "marginPercent", "fixedProfit", "finalPrice"]),
  strategyValue: z.number(),
});

type FormValues = z.infer<typeof formSchema>;

const emptyMaterial = (): FormValues["materials"][number] => ({
  materialId: "",
  name: "",
  type: "metal",
  packagePrice: 0,
  packageQuantity: 0,
  unit: "g",
  quantityUsed: 0,
  ...emptyAttrs(),
});

const num = (value: unknown): number => {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
};

const toUnit = (value: string): Unit =>
  (UNITS as readonly string[]).includes(value) ? (value as Unit) : "un";

const toMaterialType = (value: string): MaterialType =>
  (MATERIAL_TYPES as readonly string[]).includes(value)
    ? (value as MaterialType)
    : "metal";

export function FichaTecnicaClient({
  products,
  materials,
  stones,
  chains,
  wires,
  alloys,
}: FichaTecnicaClientProps) {
  const [isPending, startTransition] = useTransition();
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const { control, register, watch, setValue, reset, getValues } =
    useForm<FormValues>({
      resolver: zodResolver(formSchema),
      defaultValues: {
        productId: "",
        materials: [emptyMaterial()],
        additionalCosts: [],
        mode: "markupPercent",
        strategyValue: 100,
      },
    });

  const materialArray = useFieldArray({ control, name: "materials" });
  const costArray = useFieldArray({ control, name: "additionalCosts" });

  const values = watch();

  const result = useMemo(() => {
    const input: PricingInput = {
      materials: values.materials.map((line) => ({
        name: line.name ?? "",
        packagePrice: num(line.packagePrice),
        packageQuantity: num(line.packageQuantity),
        unit: line.unit,
        quantityUsed: num(line.quantityUsed),
      })),
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
  }, [values]);

  const selectedMode = PRICING_MODES.find((m) => m.value === values.mode);

  function handleSelectProduct(productId: string) {
    setSaveMessage(null);
    setSaveError(null);

    if (!productId) {
      reset({
        productId: "",
        materials: [emptyMaterial()],
        additionalCosts: getValues("additionalCosts"),
        mode: "markupPercent",
        strategyValue: 100,
      });
      return;
    }

    const product = products.find((p) => p.id === productId);
    if (!product) return;

    const compositionLines =
      product.compositionItems.length > 0
        ? product.compositionItems.map((item) => ({
            materialId: item.material.id,
            name: item.material.name,
            type: toMaterialType(item.material.type),
            packagePrice: item.material.purchasePrice,
            packageQuantity: item.material.purchaseQuantity,
            unit: toUnit(item.material.unit),
            quantityUsed: item.quantityUsed,
            ...pickAttrs(item.material),
          }))
        : [emptyMaterial()];

    reset({
      productId,
      materials: compositionLines,
      additionalCosts: getValues("additionalCosts"),
      mode: (product.pricingStrategy as PricingMode) ?? "markupPercent",
      strategyValue: product.pricingValue ?? 100,
    });
  }

  function applyMaterialPreset(index: number, materialId: string) {
    if (materialId === CUSTOM_MATERIAL) {
      setValue(`materials.${index}.materialId`, "");
      return;
    }

    const material = materials.find((m) => m.id === materialId);
    if (!material) return;

    setValue(`materials.${index}.materialId`, material.id);
    setValue(`materials.${index}.name`, material.name);
    setValue(`materials.${index}.type`, toMaterialType(material.type));
    setValue(`materials.${index}.packagePrice`, material.purchasePrice);
    setValue(`materials.${index}.packageQuantity`, material.purchaseQuantity);
    setValue(`materials.${index}.unit`, toUnit(material.unit));

    const attrs = pickAttrs(material);
    setValue(`materials.${index}.attrCut`, attrs.attrCut);
    setValue(`materials.${index}.attrColor`, attrs.attrColor);
    setValue(`materials.${index}.attrSizeMm`, attrs.attrSizeMm);
    setValue(`materials.${index}.attrMaterial`, attrs.attrMaterial);
    setValue(`materials.${index}.attrMesh`, attrs.attrMesh);
    setValue(`materials.${index}.attrProfile`, attrs.attrProfile);
    setValue(`materials.${index}.attrGauge`, attrs.attrGauge);
    setValue(`materials.${index}.weightPerCm`, attrs.weightPerCm);
    setValue(`materials.${index}.purity`, attrs.purity);
    setValue(`materials.${index}.pureMetalName`, attrs.pureMetalName);
    setValue(`materials.${index}.alloyMetalName`, attrs.alloyMetalName);
  }

  function handleTypeChange(index: number, type: MaterialType) {
    setValue(`materials.${index}.type`, type);
    // Sugere a unidade coerente com o tipo, sem sobrescrever escolha manual
    // quando o usuário já usa uma unidade compatível.
    setValue(`materials.${index}.unit`, MATERIAL_TYPE_META[type].suggestedUnit);
  }

  // Insere na composição as linhas geradas pelos construtores (fios/correntes
  // e sequenciador de pedras), reaproveitando o motor de precificação.
  function appendDrafts(lines: DraftLine[]) {
    setSaveMessage(null);
    setSaveError(null);
    for (const line of lines) {
      materialArray.append({
        materialId: "",
        name: line.name,
        type: toMaterialType(line.type),
        packagePrice: num(line.packagePrice),
        packageQuantity: num(line.packageQuantity) || 1,
        unit: toUnit(line.unit),
        quantityUsed: num(line.quantityUsed),
        ...pickAttrs(line),
      });
    }
  }

  function handleSave() {
    setSaveMessage(null);
    setSaveError(null);

    const current = getValues();
    if (!current.productId) {
      setSaveError("Selecione uma peça existente para salvar a ficha.");
      return;
    }

    const payload: SaveFichaInput = {
      productId: current.productId,
      mode: current.mode,
      strategyValue: num(current.strategyValue),
      sellingPrice: result.sellingPrice,
      totalCost: result.totalCost,
      materials: current.materials
        .filter((line) => line.name.trim() && num(line.quantityUsed) > 0)
        .map((line) => ({
          materialId: line.materialId || undefined,
          name: line.name.trim(),
          type: line.type,
          packagePrice: num(line.packagePrice),
          packageQuantity: num(line.packageQuantity),
          unit: line.unit,
          quantityUsed: num(line.quantityUsed),
          ...pickAttrs(line),
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
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* LADO ESQUERDO — Formulário */}
      <div className="space-y-4">
        {/* Peça + salvar */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-slate-900">1. Peça</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Controller
              control={control}
              name="productId"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={(value) => {
                    field.onChange(value === CUSTOM_MATERIAL ? "" : value);
                    handleSelectProduct(
                      value === CUSTOM_MATERIAL ? "" : value
                    );
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma peça..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={CUSTOM_MATERIAL}>
                      Novo cálculo (peça avulsa)
                    </SelectItem>
                    {products.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />

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
              {!values.productId && (
                <p className="text-xs text-slate-400">
                  Selecione uma peça existente para persistir a composição e
                  atualizar o preço.
                </p>
              )}
              {saveMessage && (
                <p className="flex items-center gap-1.5 text-xs text-green-700">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {saveMessage}
                </p>
              )}
              {saveError && (
                <p className="text-xs text-red-600">{saveError}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Materiais (metais e gemas) */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base text-slate-900">
              2. Materiais (Metais e Gemas)
            </CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => materialArray.append(emptyMaterial())}
            >
              <Plus className="h-4 w-4" />
              Adicionar
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {materialArray.fields.map((field, index) => (
              <div
                key={field.id}
                className="space-y-3 rounded-md border border-slate-200 p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-slate-400">
                    Material {index + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => materialArray.remove(index)}
                    aria-label="Remover material"
                    className="rounded p-1 text-red-500 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {materials.length > 0 && (
                  <Controller
                    control={control}
                    name={`materials.${index}.materialId`}
                    render={({ field: idField }) => (
                      <Select
                        value={idField.value || CUSTOM_MATERIAL}
                        onValueChange={(value) =>
                          applyMaterialPreset(index, value)
                        }
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Usar material salvo..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={CUSTOM_MATERIAL}>
                            Avulso (digitar)
                          </SelectItem>
                          {materials.map((material) => (
                            <SelectItem key={material.id} value={material.id}>
                              {material.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                )}

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Nome</Label>
                    <Input
                      {...register(`materials.${index}.name`)}
                      placeholder="Ex.: Ouro 18k"
                      className="h-8"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Tipo</Label>
                    <Controller
                      control={control}
                      name={`materials.${index}.type`}
                      render={({ field: typeField }) => (
                        <Select
                          value={typeField.value}
                          onValueChange={(value) =>
                            handleTypeChange(index, toMaterialType(value))
                          }
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {MATERIAL_TYPES.map((type) => (
                              <SelectItem key={type} value={type}>
                                {MATERIAL_TYPE_META[type].label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <div className="space-y-1">
                    <Label className="text-xs">Compra (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      {...register(`materials.${index}.packagePrice`, {
                        valueAsNumber: true,
                      })}
                      className="h-8"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Qtd. compra</Label>
                    <Input
                      type="number"
                      step="0.01"
                      {...register(`materials.${index}.packageQuantity`, {
                        valueAsNumber: true,
                      })}
                      className="h-8"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Unid.</Label>
                    <Controller
                      control={control}
                      name={`materials.${index}.unit`}
                      render={({ field: unitField }) => (
                        <Select
                          value={unitField.value}
                          onValueChange={unitField.onChange}
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {UNITS.map((unit) => (
                              <SelectItem key={unit} value={unit}>
                                {unit}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Usado</Label>
                    <Input
                      type="number"
                      step="0.01"
                      {...register(`materials.${index}.quantityUsed`, {
                        valueAsNumber: true,
                      })}
                      className="h-8"
                    />
                  </div>
                </div>
              </div>
            ))}
            {materialArray.fields.length === 0 && (
              <p className="text-sm text-slate-400">
                Nenhum material. Clique em Adicionar.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Custos adicionais */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-slate-900">
              3. Custos adicionais
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
            {costArray.fields.length === 0 && (
              <p className="text-sm text-slate-400">
                Nenhum custo adicional. Use os botões acima.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Estratégia */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-slate-900">
              4. Estratégia de precificação
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

        {/* Construtor de correntes e fios */}
        <WireChainBuilder
          chains={chains}
          wires={wires}
          onAppend={appendDrafts}
        />

        {/* Metais e ligas (decomposição para a requisição de compras) */}
        <AlloyBuilder alloys={alloys} onAppend={appendDrafts} />

        {/* Sequenciador visual de pedras */}
        <StoneSequencer stones={stones} onAppend={appendDrafts} />
      </div>

      {/* LADO DIREITO — Resultados */}
      <div className="lg:sticky lg:top-4 lg:self-start">
        <FichaResults result={result} />
      </div>
    </div>
  );
}
