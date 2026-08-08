"use client";

import { useMemo, useState } from "react";
import { Plus, Ruler, Sparkles, X } from "lucide-react";

import { DataTableFacetedFilter } from "@allativa/components/admin/data-table-faceted-filter";
import { Button } from "@allativa/components/ui/button";
import { Input } from "@allativa/components/ui/input";
import { Label } from "@allativa/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@allativa/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@allativa/components/ui/select";
import {
  buildStoneSequence,
  colorToHex,
  computeAlloy,
  lengthCost,
  lengthWeight,
  wireCostFromAlloy,
  type SequenceStone,
} from "@allativa/lib/jewelry-math";
import type { InsumoAttrs } from "@allativa/lib/material-requisition";

function normalize(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function countByNormalized(
  items: Array<string | null | undefined>
): Map<string, { label: string; count: number }> {
  const map = new Map<string, { label: string; count: number }>();
  for (const raw of items) {
    const label = (raw ?? "").trim();
    if (!label) continue;
    const key = normalize(label);
    const prev = map.get(key);
    if (prev) prev.count += 1;
    else map.set(key, { label, count: 1 });
  }
  return map;
}

const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

// Linha pronta para ser inserida na composição da Ficha Técnica.
// Estende InsumoAttrs para levar os metadados estruturados (usados na
// Requisição de Materiais) junto com a linha de custo.
export interface DraftLine extends InsumoAttrs {
  name: string;
  type: "metal" | "gema" | "componente";
  packagePrice: number;
  packageQuantity: number;
  unit: string;
  quantityUsed: number;
}

export interface ChainOption {
  id: string;
  name: string;
  mesh: string;
  material: string;
  thicknessMm: number | null;
  pricePerCm: number;
  weightPerCm: number | null;
}

export interface WireOption {
  id: string;
  name: string;
  material: string;
  profile: string;
  gauge: number;
  pricePerCm: number;
  weightPerCm: number | null;
  alloyId?: string | null;
  alloy?: {
    id: string;
    name: string;
    pricePerGram: number;
  } | null;
}

export interface AlloyOption {
  id: string;
  name: string;
  purity: number;
  pureMetalName: string;
  alloyMetalName: string;
  pureMetalPricePerG: number;
  alloyMetalPricePerG: number;
  pricePerGram: number;
}

// ─────────────────────────────────────────────────────────────
// Construtor de correntes e fios
// ─────────────────────────────────────────────────────────────

export function WireChainBuilder({
  chains,
  wires,
  onAppend,
}: {
  chains: ChainOption[];
  wires: WireOption[];
  onAppend: (lines: DraftLine[]) => void;
}) {
  const [selected, setSelected] = useState("");
  const [cm, setCm] = useState("");

  const resolved = useMemo(() => {
    if (!selected) return null;
    const [kind, id] = selected.split(":");
    if (kind === "chain") {
      const c = chains.find((x) => x.id === id);
      return c ? ({ kind: "chain", chain: c } as const) : null;
    }
    const w = wires.find((x) => x.id === id);
    return w ? ({ kind: "wire", wire: w } as const) : null;
  }, [selected, chains, wires]);

  const pricePerCm =
    resolved?.kind === "chain"
      ? resolved.chain.pricePerCm
      : resolved?.wire
        ? wireCostFromAlloy(
            resolved.wire.weightPerCm,
            1,
            resolved.wire.alloy?.pricePerGram ?? 0
          ).pricePerCm || resolved.wire.pricePerCm
        : 0;
  const weightPerCm =
    resolved?.kind === "chain"
      ? resolved.chain.weightPerCm
      : resolved?.wire.weightPerCm ?? null;
  const resolvedName =
    resolved?.kind === "chain" ? resolved.chain.name : resolved?.wire.name ?? "";

  const centimeters = Number(String(cm).replace(",", ".")) || 0;

  const wireInherited =
    resolved?.kind === "wire"
      ? wireCostFromAlloy(
          resolved.wire.weightPerCm,
          centimeters,
          resolved.wire.alloy?.pricePerGram ?? 0
        )
      : null;

  const cost =
    resolved?.kind === "chain"
      ? lengthCost(pricePerCm, centimeters)
      : wireInherited?.cost ?? 0;
  const weight =
    resolved?.kind === "chain"
      ? lengthWeight(weightPerCm, centimeters)
      : wireInherited?.weightG ?? 0;

  const hasOptions = chains.length > 0 || wires.length > 0;

  function handleAdd() {
    if (!resolved || centimeters <= 0) return;

    if (resolved.kind === "chain") {
      onAppend([
        {
          packagePrice: resolved.chain.pricePerCm,
          packageQuantity: 1,
          unit: "cm",
          quantityUsed: centimeters,
          weightPerCm: resolved.chain.weightPerCm,
          name: resolved.chain.name,
          type: "componente",
          attrMesh: resolved.chain.mesh,
          attrMaterial: resolved.chain.material,
          attrSizeMm: resolved.chain.thicknessMm,
        },
      ]);
    } else {
      const w = resolved.wire;
      const pricePerGram = w.alloy?.pricePerGram ?? 0;
      const { weightG } = wireCostFromAlloy(
        w.weightPerCm,
        centimeters,
        pricePerGram
      );
      // Herança: custo em gramas × preço definido da liga.
      onAppend([
        {
          name: w.name,
          type: "metal",
          packagePrice: pricePerGram,
          packageQuantity: 1,
          unit: "g",
          quantityUsed: weightG > 0 ? weightG : centimeters,
          weightPerCm: w.weightPerCm,
          attrProfile: w.profile,
          attrMaterial: w.alloy?.name ?? w.material,
          attrGauge: w.gauge,
        },
      ]);
    }
    setCm("");
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base text-slate-900">
          <Ruler className="h-4 w-4 text-brand-700" />
          5. Construtor de correntes e fios
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!hasOptions && (
          <p className="text-sm text-slate-400">
            Cadastre correntes e fios na Biblioteca de Insumos para usá-los aqui.
          </p>
        )}
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr,7rem,auto] sm:items-end">
          <div className="space-y-1">
            <Label className="text-xs">Insumo</Label>
            <Select value={selected} onValueChange={setSelected}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Selecione o fio/corrente..." />
              </SelectTrigger>
              <SelectContent>
                {wires.map((w) => (
                  <SelectItem key={w.id} value={`wire:${w.id}`}>
                    Fio · {w.name}
                    {w.alloy
                      ? ` (${w.alloy.name} · ${BRL.format(w.alloy.pricePerGram)}/g)`
                      : ""}
                  </SelectItem>
                ))}
                {chains.map((c) => (
                  <SelectItem key={c.id} value={`chain:${c.id}`}>
                    Corrente · {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Cm usados</Label>
            <Input
              type="number"
              step="0.1"
              min={0}
              value={cm}
              onChange={(e) => setCm(e.target.value)}
              placeholder="0"
              className="h-9"
            />
          </div>
          <Button
            type="button"
            onClick={handleAdd}
            disabled={!resolved || centimeters <= 0}
            className="h-9 bg-brand-600 text-white hover:bg-brand-700"
          >
            <Plus className="h-4 w-4" />
            Adicionar
          </Button>
        </div>

        {resolved && centimeters > 0 && (
          <div className="flex flex-col gap-1 rounded-md border border-brand-200 bg-brand-50/60 px-3 py-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-slate-600">
                {resolvedName} · {centimeters} cm
                {weight > 0 && (
                  <>
                    {" "}
                    ·{" "}
                    {weight.toLocaleString("pt-BR", {
                      maximumFractionDigits: 3,
                    })}{" "}
                    g
                  </>
                )}
              </span>
              <span className="font-semibold text-brand-800">
                {BRL.format(cost)}
              </span>
            </div>
            {resolved.kind === "wire" && resolved.wire.alloy && (
              <p className="text-xs text-brand-800/80">
                Herança: {resolved.wire.alloy.name} ·{" "}
                {BRL.format(resolved.wire.alloy.pricePerGram)}/g
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────
// Sequenciador visual de pedras
// ─────────────────────────────────────────────────────────────

export function StoneSequencer({
  stones,
  onAppend,
}: {
  stones: SequenceStone[];
  onAppend: (lines: DraftLine[]) => void;
}) {
  const [pattern, setPattern] = useState<string[]>([]);
  const [total, setTotal] = useState("");

  // Filtros facetados (mesmo padrão de Insumos — aba Pedras)
  const [cuts, setCuts] = useState<Set<string>>(new Set());
  const [colors, setColors] = useState<Set<string>>(new Set());
  const [sizes, setSizes] = useState<Set<string>>(new Set());

  const stoneById = useMemo(() => {
    const map = new Map<string, SequenceStone>();
    for (const s of stones) map.set(s.id, s);
    return map;
  }, [stones]);

  const cutOptions = useMemo(() => {
    const counts = countByNormalized(stones.map((s) => s.cut));
    return Array.from(counts.entries())
      .sort((a, b) => a[1].label.localeCompare(b[1].label, "pt-BR"))
      .map(([value, { label, count }]) => ({ value, label, count }));
  }, [stones]);

  const colorOptions = useMemo(() => {
    const counts = countByNormalized(stones.map((s) => s.color));
    return Array.from(counts.entries())
      .sort((a, b) => a[1].label.localeCompare(b[1].label, "pt-BR"))
      .map(([value, { label, count }]) => ({ value, label, count }));
  }, [stones]);

  const sizeOptions = useMemo(() => {
    const counts = countByNormalized(
      stones.map((s) =>
        s.sizeMm != null && Number.isFinite(s.sizeMm) ? String(s.sizeMm) : null
      )
    );
    return Array.from(counts.entries())
      .sort((a, b) => Number(a[1].label) - Number(b[1].label))
      .map(([value, { label, count }]) => ({
        value,
        label: `${label} mm`,
        count,
      }));
  }, [stones]);

  const filteredStones = useMemo(() => {
    return stones.filter((s) => {
      if (cuts.size > 0 && !cuts.has(normalize(s.cut))) return false;
      if (colors.size > 0 && !colors.has(normalize(s.color))) return false;
      if (
        sizes.size > 0 &&
        !sizes.has(
          normalize(
            s.sizeMm != null && Number.isFinite(s.sizeMm)
              ? String(s.sizeMm)
              : ""
          )
        )
      ) {
        return false;
      }
      return true;
    });
  }, [stones, cuts, colors, sizes]);

  const hasActiveFilters =
    cuts.size > 0 || colors.size > 0 || sizes.size > 0;

  function resetFilters() {
    setCuts(new Set());
    setColors(new Set());
    setSizes(new Set());
  }

  const patternStones = useMemo(
    () =>
      pattern
        .map((id) => stoneById.get(id))
        .filter((s): s is SequenceStone => Boolean(s)),
    [pattern, stoneById]
  );

  const totalNum = Math.max(Math.floor(Number(total) || 0), 0);

  const result = useMemo(
    () => buildStoneSequence(patternStones, totalNum),
    [patternStones, totalNum]
  );

  const visibleDots = result.sequence.slice(0, 120);
  const hiddenDots = result.sequence.length - visibleDots.length;

  function addToPattern(id: string) {
    setPattern((p) => [...p, id]);
  }
  function removeFromPattern(index: number) {
    setPattern((p) => p.filter((_, i) => i !== index));
  }

  function handleAppend() {
    if (result.groups.length === 0) return;
    onAppend(
      result.groups
        .filter((g) => g.count > 0)
        .map((g) => {
          // Nome único por lapidação+cor+tamanho — evita colisão no Material.upsert.
          const name = [g.name, g.cut, g.color, g.sizeMm != null ? `${g.sizeMm}mm` : null]
            .filter(Boolean)
            .join(" · ");
          return {
            name,
            type: "gema" as const,
            packagePrice: g.unitPrice,
            packageQuantity: 1,
            unit: "un",
            quantityUsed: g.count,
            attrCut: g.cut?.trim() || null,
            attrColor: g.color?.trim() || null,
            attrSizeMm: g.sizeMm ?? null,
          };
        })
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base text-slate-900">
          <Sparkles className="h-4 w-4 text-brand-700" />
          6. Sequenciador de pedras
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {stones.length === 0 ? (
          <p className="text-sm text-slate-400">
            Cadastre pedras na Biblioteca de Insumos para montar o padrão.
          </p>
        ) : (
          <>
            {/* Paleta — filtros facetados (Lapidação / Cor / Tamanho) */}
            <div className="space-y-2">
              <Label className="text-xs">
                Filtre e toque para montar o padrão
              </Label>
              <div className="flex flex-wrap items-center gap-2 rounded-lg border border-brand-100 bg-brand-50/40 px-2.5 py-2">
                <DataTableFacetedFilter
                  title="Lapidação"
                  options={cutOptions}
                  selected={cuts}
                  onSelectedChange={setCuts}
                />
                <DataTableFacetedFilter
                  title="Cor"
                  options={colorOptions}
                  selected={colors}
                  onSelectedChange={setColors}
                />
                <DataTableFacetedFilter
                  title="Tamanho"
                  options={sizeOptions}
                  selected={sizes}
                  onSelectedChange={setSizes}
                />
                <span className="ml-auto text-xs text-slate-500">
                  {filteredStones.length === stones.length
                    ? `${stones.length} item(ns)`
                    : `${filteredStones.length} de ${stones.length}`}
                </span>
                {hasActiveFilters && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={resetFilters}
                    className="h-8 px-2 text-slate-600 hover:text-brand-800"
                  >
                    Limpar
                    <X className="ml-1 h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
              <div className="flex max-h-40 flex-wrap gap-2 overflow-y-auto rounded-md border border-slate-200 bg-white p-2">
                {filteredStones.map((s) => {
                  const meta = [
                    s.cut,
                    s.color,
                    s.sizeMm != null ? `${s.sizeMm}mm` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ");
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => addToPattern(s.id)}
                      title={`${s.name}${meta ? ` · ${meta}` : ""}`}
                      className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-700 shadow-sm transition-colors hover:border-brand-300 hover:bg-brand-50"
                    >
                      <span
                        className="h-3 w-3 shrink-0 rounded-full border border-slate-300"
                        style={{ backgroundColor: colorToHex(s.color) }}
                      />
                      <span className="truncate">{s.name}</span>
                      {meta ? (
                        <span className="truncate text-[10px] text-slate-400">
                          {meta}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
                {filteredStones.length === 0 && (
                  <p className="w-full py-2 text-center text-xs text-slate-400">
                    Nenhuma pedra com esses filtros.
                  </p>
                )}
              </div>
            </div>

            {/* Padrão montado */}
            <div className="space-y-1.5">
              <Label className="text-xs">
                Padrão ({pattern.length} pedra
                {pattern.length === 1 ? "" : "s"})
              </Label>
              {pattern.length === 0 ? (
                <p className="rounded-md border border-dashed border-slate-200 px-3 py-4 text-center text-xs text-slate-400">
                  Nenhuma pedra no padrão ainda.
                </p>
              ) : (
                <div className="flex flex-wrap items-center gap-2 rounded-md border border-slate-200 p-2">
                  {patternStones.map((s, index) => (
                    <span
                      key={`${s.id}-${index}`}
                      className="group inline-flex items-center gap-1 rounded-full bg-slate-50 py-0.5 pl-1 pr-1.5 text-xs text-slate-700"
                    >
                      <span
                        className="h-4 w-4 rounded-full border border-slate-300"
                        style={{ backgroundColor: colorToHex(s.color) }}
                        title={`${s.name} · ${s.color}`}
                      />
                      <button
                        type="button"
                        onClick={() => removeFromPattern(index)}
                        aria-label="Remover do padrão"
                        className="text-slate-400 hover:text-red-500"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                  <button
                    type="button"
                    onClick={() => setPattern([])}
                    className="ml-auto text-xs text-slate-400 hover:text-red-500"
                  >
                    limpar
                  </button>
                </div>
              )}
            </div>

            {/* Quantidade total */}
            <div className="w-full sm:w-56 space-y-1">
              <Label className="text-xs">Quantidade total de pedras</Label>
              <Input
                type="number"
                min={0}
                step={1}
                value={total}
                onChange={(e) => setTotal(e.target.value)}
                placeholder="Ex.: 45"
                className="h-9"
              />
            </div>

            {/* Prévia da cravação + resumo */}
            {result.groups.length > 0 && totalNum > 0 && (
              <div className="space-y-3 rounded-md border border-brand-200 bg-brand-50/60 p-3">
                <div className="flex flex-wrap gap-1">
                  {visibleDots.map((id, i) => (
                    <span
                      key={i}
                      className="h-4 w-4 rounded-full border border-white shadow-sm"
                      style={{
                        backgroundColor: colorToHex(
                          stoneById.get(id)?.color ?? ""
                        ),
                      }}
                    />
                  ))}
                  {hiddenDots > 0 && (
                    <span className="text-xs text-slate-500">
                      +{hiddenDots}
                    </span>
                  )}
                </div>

                <div className="space-y-1">
                  {result.groups.map((g) => (
                    <div
                      key={g.stoneId}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="inline-flex items-center gap-2 text-slate-700">
                        <span
                          className="h-3 w-3 rounded-full border border-slate-300"
                          style={{ backgroundColor: g.colorHex }}
                        />
                        {g.count}× {g.name}
                      </span>
                      <span className="text-slate-600">
                        {g.totalWeightCt.toLocaleString("pt-BR", {
                          maximumFractionDigits: 3,
                        })}{" "}
                        ct · {BRL.format(g.totalValue)}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between border-t border-brand-200 pt-2 text-sm">
                  <span className="font-medium text-slate-700">
                    {result.totalStones} pedras ·{" "}
                    {result.totalWeightCt.toLocaleString("pt-BR", {
                      maximumFractionDigits: 3,
                    })}{" "}
                    ct
                  </span>
                  <span className="font-semibold text-brand-800">
                    {BRL.format(result.totalValue)}
                  </span>
                </div>

                <Button
                  type="button"
                  onClick={handleAppend}
                  className="w-full bg-brand-600 text-white hover:bg-brand-700"
                >
                  <Plus className="h-4 w-4" />
                  Adicionar pedras à composição
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────
// Construtor de metais e ligas (decompõe a liga em metal puro + pré-liga)
// ─────────────────────────────────────────────────────────────

export function AlloyBuilder({
  alloys,
  onAppend,
}: {
  alloys: AlloyOption[];
  onAppend: (lines: DraftLine[]) => void;
}) {
  const [selected, setSelected] = useState("");
  const [grams, setGrams] = useState("");

  const alloy = useMemo(
    () => alloys.find((a) => a.id === selected) ?? null,
    [alloys, selected]
  );

  const weight = Number(String(grams).replace(",", ".")) || 0;

  const result = useMemo(() => {
    if (!alloy) return null;
    return computeAlloy({
      finalWeight: weight,
      purity: alloy.purity,
      pureMetalPricePerG: alloy.pureMetalPricePerG,
      alloyMetalPricePerG: alloy.alloyMetalPricePerG,
    });
  }, [alloy, weight]);

  function handleAdd() {
    if (!alloy || weight <= 0) return;
    // Usa o Preço Definido por Grama (não o custo teórico da mistura).
    onAppend([
      {
        name: alloy.name,
        type: "metal",
        packagePrice: alloy.pricePerGram,
        packageQuantity: 1,
        unit: "g",
        quantityUsed: weight,
        attrMaterial: alloy.name,
        purity: alloy.purity,
        pureMetalName: alloy.pureMetalName,
        alloyMetalName: alloy.alloyMetalName,
      },
    ]);
    setGrams("");
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base text-slate-900">
          <Sparkles className="h-4 w-4 text-brand-700" />
          7. Metais e ligas
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {alloys.length === 0 && (
          <p className="text-sm text-slate-400">
            Cadastre ligas na Biblioteca de Insumos para usá-las aqui.
          </p>
        )}
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr,7rem,auto] sm:items-end">
          <div className="space-y-1">
            <Label className="text-xs">Liga</Label>
            <Select value={selected} onValueChange={setSelected}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Selecione a liga..." />
              </SelectTrigger>
              <SelectContent>
                {alloys.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name} — {BRL.format(a.pricePerGram)}/g
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Gramas (peça)</Label>
            <Input
              type="number"
              step="0.01"
              min={0}
              value={grams}
              onChange={(e) => setGrams(e.target.value)}
              placeholder="0"
              className="h-9"
            />
          </div>
          <Button
            type="button"
            onClick={handleAdd}
            disabled={!alloy || weight <= 0}
            className="h-9 bg-brand-600 text-white hover:bg-brand-700"
          >
            <Plus className="h-4 w-4" />
            Adicionar
          </Button>
        </div>

        {alloy && weight > 0 && (
          <div className="space-y-1 rounded-md border border-brand-200 bg-brand-50/60 px-3 py-2 text-sm">
            {result && (
              <>
                <div className="flex items-center justify-between text-slate-500">
                  <span>{alloy.pureMetalName} (ref.)</span>
                  <span>
                    {result.pureWeight.toLocaleString("pt-BR", {
                      maximumFractionDigits: 3,
                    })}{" "}
                    g
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-500">
                  <span>{alloy.alloyMetalName} (ref.)</span>
                  <span>
                    {result.alloyWeight.toLocaleString("pt-BR", {
                      maximumFractionDigits: 3,
                    })}{" "}
                    g
                  </span>
                </div>
              </>
            )}
            <div className="flex items-center justify-between border-t border-brand-200 pt-1 font-semibold text-brand-800">
              <span>
                {weight} g · {BRL.format(alloy.pricePerGram)}/g
              </span>
              <span>{BRL.format(alloy.pricePerGram * weight)}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
