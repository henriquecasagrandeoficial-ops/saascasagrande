"use client";

import { useMemo, useState, useTransition } from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ArrowDown,
  ArrowUp,
  ClipboardList,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";
import type { Chain, MetalAlloy, Stone } from "@allativa/generated/client";

import {
  deleteSupplyPattern,
  saveSupplyPattern,
} from "@/app/allativa/painel/insumos/pattern-actions";
import { DataTableFacetedFilter } from "@allativa/components/admin/data-table-faceted-filter";
import { DeleteConfirmDialog } from "@allativa/components/admin/delete-confirm-dialog";
import { Button } from "@allativa/components/ui/button";
import { Input } from "@allativa/components/ui/input";
import { Label } from "@allativa/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@allativa/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@allativa/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@allativa/components/ui/table";
import { Textarea } from "@allativa/components/ui/textarea";

type WireOption = {
  id: string;
  name: string;
  material: string;
  profile: string;
  gauge: number;
  alloy?: { id: string; name: string; pricePerGram: number } | null;
};

export type SupplyPatternRow = {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  items: {
    id: string;
    itemKind: string;
    sequenceOrder: number;
    quantity: number;
    stoneId: string | null;
    alloyId: string | null;
    chainId: string | null;
    wireId: string | null;
    stone?: { id: string; name: string; cut: string; color: string; sizeMm: number | null } | null;
    alloy?: { id: string; name: string } | null;
    chain?: { id: string; name: string; mesh: string } | null;
    wire?: { id: string; name: string } | null;
  }[];
};

const ITEM_KINDS = [
  { value: "pedra", label: "Pedra" },
  { value: "metal", label: "Metal / Liga" },
  { value: "corrente", label: "Corrente" },
  { value: "fio", label: "Fio" },
] as const;

const itemSchema = z.object({
  itemKind: z.enum(["pedra", "metal", "corrente", "fio"]),
  quantity: z.number().positive(),
  sequenceOrder: z.number(),
  stoneId: z.string().optional(),
  alloyId: z.string().optional(),
  chainId: z.string().optional(),
  wireId: z.string().optional(),
});

const formSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  description: z.string().optional(),
  items: z.array(itemSchema).min(1),
});

type FormValues = z.infer<typeof formSchema>;

function normalize(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function emptyItem(sequenceOrder = 0): FormValues["items"][number] {
  return {
    itemKind: "pedra",
    quantity: 1,
    sequenceOrder,
    stoneId: "",
    alloyId: "",
    chainId: "",
    wireId: "",
  };
}

function itemLabel(item: SupplyPatternRow["items"][number]): string {
  if (item.stone) {
    return [item.stone.name, item.stone.cut, item.stone.color]
      .filter(Boolean)
      .join(" · ");
  }
  if (item.alloy) return item.alloy.name;
  if (item.chain) return `${item.chain.name} (${item.chain.mesh})`;
  if (item.wire) return item.wire.name;
  return item.itemKind;
}

interface PatternFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pattern: SupplyPatternRow | null;
  stones: Stone[];
  alloys: MetalAlloy[];
  chains: Chain[];
  wires: WireOption[];
  onSaved: (message: string) => void;
}

export function PatternFormDialog({
  open,
  onOpenChange,
  pattern,
  stones,
  alloys,
  chains,
  wires,
  onSaved,
}: PatternFormDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [cuts, setCuts] = useState<Set<string>>(new Set());
  const [colors, setColors] = useState<Set<string>>(new Set());
  const [sizes, setSizes] = useState<Set<string>>(new Set());

  const defaultValues: FormValues = pattern
    ? {
        id: pattern.id,
        name: pattern.name,
        description: pattern.description ?? "",
        items: pattern.items
          .slice()
          .sort((a, b) => a.sequenceOrder - b.sequenceOrder)
          .map((item, i) => ({
            itemKind: item.itemKind as FormValues["items"][number]["itemKind"],
            quantity: item.quantity,
            sequenceOrder: i,
            stoneId: item.stoneId ?? "",
            alloyId: item.alloyId ?? "",
            chainId: item.chainId ?? "",
            wireId: item.wireId ?? "",
          })),
      }
    : {
        name: "",
        description: "",
        items: [emptyItem(0)],
      };

  const { control, register, handleSubmit, reset, watch, setValue, getValues } =
    useForm<FormValues>({
      resolver: zodResolver(formSchema),
      values: open ? defaultValues : undefined,
      defaultValues,
    });

  const itemsArray = useFieldArray({ control, name: "items" });
  const watchedItems = watch("items");

  const cutOptions = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of stones) {
      const k = normalize(s.cut);
      if (!k) continue;
      map.set(s.cut, (map.get(s.cut) ?? 0) + 1);
    }
    return [...map.entries()]
      .map(([label, count]) => ({ value: normalize(label), label, count }))
      .sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));
  }, [stones]);

  const colorOptions = useMemo(() => {
    const map = new Map<string, { label: string; count: number }>();
    for (const s of stones) {
      const key = normalize(s.color);
      if (!key) continue;
      const prev = map.get(key);
      if (prev) prev.count += 1;
      else map.set(key, { label: s.color, count: 1 });
    }
    return [...map.entries()].map(([value, { label, count }]) => ({
      value,
      label,
      count,
    }));
  }, [stones]);

  const sizeOptions = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of stones) {
      if (s.sizeMm == null) continue;
      const label = String(s.sizeMm);
      map.set(label, (map.get(label) ?? 0) + 1);
    }
    return [...map.entries()]
      .map(([label, count]) => ({ value: label, label: `${label} mm`, count }))
      .sort((a, b) => Number(a.value) - Number(b.value));
  }, [stones]);

  const filteredStones = useMemo(() => {
    return stones.filter((s) => {
      if (cuts.size > 0 && !cuts.has(normalize(s.cut))) return false;
      if (colors.size > 0 && !colors.has(normalize(s.color))) return false;
      if (sizes.size > 0) {
        if (s.sizeMm == null || !sizes.has(String(s.sizeMm))) return false;
      }
      return true;
    });
  }, [stones, cuts, colors, sizes]);

  function reindex() {
    const current = getValues("items");
    current.forEach((_, i) => setValue(`items.${i}.sequenceOrder`, i));
  }

  function onSubmit(values: FormValues) {
    setError(null);
    startTransition(async () => {
      const res = await saveSupplyPattern({
        id: values.id,
        name: values.name,
        description: values.description || null,
        isActive: true,
        items: values.items.map((item, i) => ({
          itemKind: item.itemKind,
          quantity: item.quantity,
          sequenceOrder: i,
          stoneId: item.stoneId || null,
          alloyId: item.alloyId || null,
          chainId: item.chainId || null,
          wireId: item.wireId || null,
        })),
      });
      if (res.error) {
        setError(res.error);
        return;
      }
      onSaved(res.message ?? "Ordem salva.");
      onOpenChange(false);
      reset();
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) {
          setError(null);
          setCuts(new Set());
          setColors(new Set());
          setSizes(new Set());
        }
      }}
    >
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl">
            {pattern ? "Editar ordem" : "Nova ordem de insumos"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Nome da ordem</Label>
              <Input
                {...register("name")}
                placeholder='Ex.: "Ordem Cravação Halo"'
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Descrição (opcional)</Label>
              <Textarea
                {...register("description")}
                rows={2}
                placeholder="Notas de montagem para o ourives..."
              />
            </div>
          </div>

          <div className="space-y-2 rounded-lg border border-brand-100 bg-brand-50/40 p-3">
            <p className="text-xs font-medium text-brand-800">
              Filtros da biblioteca (lapidação / cor / tamanho) — afetam o
              seletor de pedras
            </p>
            <div className="flex flex-wrap gap-2">
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
            </div>
          </div>

          <div className="flex items-center justify-between gap-2">
            <Label className="text-sm">Itens da ordem</Label>
            <Button
              type="button"
              size="sm"
              className="h-8 rounded-full bg-brand-600 text-white hover:bg-brand-700"
              onClick={() =>
                itemsArray.append(emptyItem(itemsArray.fields.length))
              }
            >
              <Plus className="h-4 w-4" />
              Item
            </Button>
          </div>

          <div className="space-y-3">
            {itemsArray.fields.map((field, index) => {
              const kind = watchedItems?.[index]?.itemKind ?? "pedra";
              return (
                <div
                  key={field.id}
                  className="space-y-2 rounded-lg border border-slate-200 p-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">
                      Linha {index + 1}
                    </span>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        disabled={index === 0}
                        onClick={() => {
                          itemsArray.move(index, index - 1);
                          queueMicrotask(reindex);
                        }}
                        className="rounded p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-30"
                        aria-label="Subir"
                      >
                        <ArrowUp className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        disabled={index === itemsArray.fields.length - 1}
                        onClick={() => {
                          itemsArray.move(index, index + 1);
                          queueMicrotask(reindex);
                        }}
                        className="rounded p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-30"
                        aria-label="Descer"
                      >
                        <ArrowDown className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          itemsArray.remove(index);
                          queueMicrotask(reindex);
                        }}
                        className="rounded p-1 text-red-500 hover:bg-red-50"
                        aria-label="Remover"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-[8rem_1fr_5.5rem]">
                    <div className="space-y-1">
                      <Label className="text-xs">Tipo</Label>
                      <Controller
                        control={control}
                        name={`items.${index}.itemKind`}
                        render={({ field: kindField }) => (
                          <Select
                            value={kindField.value}
                            onValueChange={(v) => {
                              kindField.onChange(v);
                              setValue(`items.${index}.stoneId`, "");
                              setValue(`items.${index}.alloyId`, "");
                              setValue(`items.${index}.chainId`, "");
                              setValue(`items.${index}.wireId`, "");
                            }}
                          >
                            <SelectTrigger className="h-9">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {ITEM_KINDS.map((k) => (
                                <SelectItem key={k.value} value={k.value}>
                                  {k.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Insumo</Label>
                      {kind === "pedra" && (
                        <Controller
                          control={control}
                          name={`items.${index}.stoneId`}
                          render={({ field: idField }) => (
                            <Select
                              value={idField.value || undefined}
                              onValueChange={idField.onChange}
                            >
                              <SelectTrigger className="h-9">
                                <SelectValue placeholder="Pedra..." />
                              </SelectTrigger>
                              <SelectContent>
                                {filteredStones.map((s) => (
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
                      )}
                      {kind === "metal" && (
                        <Controller
                          control={control}
                          name={`items.${index}.alloyId`}
                          render={({ field: idField }) => (
                            <Select
                              value={idField.value || undefined}
                              onValueChange={idField.onChange}
                            >
                              <SelectTrigger className="h-9">
                                <SelectValue placeholder="Liga..." />
                              </SelectTrigger>
                              <SelectContent>
                                {alloys.map((a) => (
                                  <SelectItem key={a.id} value={a.id}>
                                    {a.name} — R$ {a.pricePerGram.toFixed(2)}/g
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        />
                      )}
                      {kind === "corrente" && (
                        <Controller
                          control={control}
                          name={`items.${index}.chainId`}
                          render={({ field: idField }) => (
                            <Select
                              value={idField.value || undefined}
                              onValueChange={idField.onChange}
                            >
                              <SelectTrigger className="h-9">
                                <SelectValue placeholder="Corrente..." />
                              </SelectTrigger>
                              <SelectContent>
                                {chains.map((c) => (
                                  <SelectItem key={c.id} value={c.id}>
                                    {c.name} ({c.mesh})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        />
                      )}
                      {kind === "fio" && (
                        <Controller
                          control={control}
                          name={`items.${index}.wireId`}
                          render={({ field: idField }) => (
                            <Select
                              value={idField.value || undefined}
                              onValueChange={idField.onChange}
                            >
                              <SelectTrigger className="h-9">
                                <SelectValue placeholder="Fio..." />
                              </SelectTrigger>
                              <SelectContent>
                                {wires.map((w) => (
                                  <SelectItem key={w.id} value={w.id}>
                                    {w.name}
                                    {w.alloy ? ` (${w.alloy.name})` : ""}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        />
                      )}
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">
                        Qtd
                        {kind === "metal"
                          ? " (g)"
                          : kind === "corrente" || kind === "fio"
                            ? " (cm)"
                            : " (un)"}
                      </Label>
                      <Input
                        type="number"
                        step="0.01"
                        min={0}
                        className="h-9"
                        {...register(`items.${index}.quantity`, {
                          valueAsNumber: true,
                        })}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="bg-brand-600 text-white hover:bg-brand-700"
            >
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Salvar ordem
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface PatternsPanelProps {
  patterns: SupplyPatternRow[];
  stones: Stone[];
  alloys: MetalAlloy[];
  chains: Chain[];
  wires: WireOption[];
  onToast: (toast: { type: "success" | "error"; message: string }) => void;
}

export function PatternsPanel({
  patterns,
  stones,
  alloys,
  chains,
  wires,
  onToast,
}: PatternsPanelProps) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<SupplyPatternRow | null>(null);

  function openNew() {
    setSelected(null);
    setOpen(true);
  }
  function openEdit(p: SupplyPatternRow) {
    setSelected(p);
    setOpen(true);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-slate-500">
          Kits reutilizáveis (ex.: halo de cravação). Na Ficha Técnica, multiplique
          a ordem inteira.
        </p>
        <Button
          type="button"
          onClick={openNew}
          className="bg-brand-600 text-white hover:bg-brand-700"
        >
          <Plus className="h-4 w-4" />
          Nova ordem
        </Button>
      </div>

      <div className="overflow-hidden rounded-md border border-slate-200 bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Itens</TableHead>
              <TableHead className="w-28 text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {patterns.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={3}
                  className="py-10 text-center text-sm text-slate-400"
                >
                  Nenhuma ordem cadastrada. Crie um padrão para reutilizar na
                  ficha.
                </TableCell>
              </TableRow>
            ) : (
              patterns.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <div className="flex items-start gap-2">
                      <ClipboardList className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" />
                      <div>
                        <p className="font-medium text-slate-900">{p.name}</p>
                        {p.description && (
                          <p className="text-xs text-slate-400">
                            {p.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <ul className="space-y-0.5 text-xs text-slate-600">
                      {p.items
                        .slice()
                        .sort((a, b) => a.sequenceOrder - b.sequenceOrder)
                        .slice(0, 4)
                        .map((item) => (
                          <li key={item.id}>
                            {item.quantity}× {itemLabel(item)}
                          </li>
                        ))}
                      {p.items.length > 4 && (
                        <li className="text-slate-400">
                          +{p.items.length - 4} item(ns)
                        </li>
                      )}
                    </ul>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit(p)}
                      >
                        Editar
                      </Button>
                      <DeleteConfirmDialog
                        title="Excluir ordem?"
                        description={`A ordem "${p.name}" será removida. Peças já salvas mantêm as folhas expandidas.`}
                        onConfirm={async () => {
                          const res = await deleteSupplyPattern(p.id);
                          if (res.error) {
                            onToast({ type: "error", message: res.error });
                          } else {
                            onToast({
                              type: "success",
                              message: res.message ?? "Ordem excluída.",
                            });
                          }
                          return res;
                        }}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <PatternFormDialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setSelected(null);
        }}
        pattern={selected}
        stones={stones}
        alloys={alloys}
        chains={chains}
        wires={wires}
        onSaved={(message) => onToast({ type: "success", message })}
      />
    </div>
  );
}
