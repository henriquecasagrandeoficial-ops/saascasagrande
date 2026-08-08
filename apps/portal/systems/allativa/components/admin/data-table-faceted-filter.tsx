"use client";

import { Check, PlusCircle } from "lucide-react";

import { cn } from "@allativa/lib/utils";
import { Badge } from "@allativa/components/ui/badge";
import { Button } from "@allativa/components/ui/button";
import { Checkbox } from "@allativa/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@allativa/components/ui/popover";
import { Separator } from "@allativa/components/ui/separator";

export type FacetOption = {
  /** Valor usado no filtro (normalizado ou bruto). */
  value: string;
  /** Rótulo exibido. */
  label: string;
  /** Contagem opcional de itens com esse valor. */
  count?: number;
  /** Indicador visual (ex.: bolinha de cor). */
  swatch?: string;
};

interface DataTableFacetedFilterProps {
  title: string;
  options: FacetOption[];
  selected: Set<string>;
  onSelectedChange: (next: Set<string>) => void;
}

/**
 * Filtro facetado (multi-select) no estilo shadcn Data Table.
 * Botão outline discreto; badge com contagem/seleções quando ativo.
 */
export function DataTableFacetedFilter({
  title,
  options,
  selected,
  onSelectedChange,
}: DataTableFacetedFilterProps) {
  const selectedCount = selected.size;

  function toggle(value: string) {
    const next = new Set(selected);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    onSelectedChange(next);
  }

  function clear() {
    onSelectedChange(new Set());
  }

  const selectedLabels = options
    .filter((o) => selected.has(o.value))
    .map((o) => o.label);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn(
            "h-9 border-dashed border-slate-300 bg-white text-slate-700 hover:border-brand-300 hover:bg-brand-50/50 hover:text-brand-800",
            selectedCount > 0 && "border-brand-300 bg-brand-50/40"
          )}
        >
          <PlusCircle className="h-4 w-4 text-brand-700" />
          {title}
          {selectedCount > 0 && (
            <>
              <Separator orientation="vertical" className="mx-1 h-4" />
              <Badge
                variant="brand"
                className="rounded-sm px-1.5 font-normal lg:hidden"
              >
                {selectedCount}
              </Badge>
              <div className="hidden space-x-1 lg:flex">
                {selectedCount > 2 ? (
                  <Badge variant="brand" className="rounded-sm px-1.5 font-normal">
                    {selectedCount} selecionados
                  </Badge>
                ) : (
                  selectedLabels.map((label) => (
                    <Badge
                      key={label}
                      variant="brand"
                      className="rounded-sm px-1.5 font-normal"
                    >
                      {label}
                    </Badge>
                  ))
                )}
              </div>
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[240px] p-0" align="start">
        <div className="border-b border-slate-100 px-3 py-2">
          <p className="text-xs font-medium text-slate-500">{title}</p>
        </div>
        <div className="max-h-64 overflow-y-auto p-1">
          {options.length === 0 ? (
            <p className="px-2 py-4 text-center text-xs text-slate-400">
              Nenhuma opção disponível
            </p>
          ) : (
            options.map((option) => {
              const isSelected = selected.has(option.value);
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => toggle(option.value)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-50",
                    isSelected && "bg-brand-50/60"
                  )}
                >
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => toggle(option.value)}
                    onClick={(e) => e.stopPropagation()}
                    aria-label={option.label}
                  />
                  {option.swatch && (
                    <span
                      className="h-3 w-3 shrink-0 rounded-full border border-slate-300"
                      style={{ backgroundColor: option.swatch }}
                    />
                  )}
                  <span className="flex-1 truncate capitalize">
                    {option.label}
                  </span>
                  {typeof option.count === "number" && (
                    <span className="ml-auto font-mono text-xs text-slate-400">
                      {option.count}
                    </span>
                  )}
                  {isSelected && (
                    <Check className="h-3.5 w-3.5 shrink-0 text-brand-700" />
                  )}
                </button>
              );
            })
          )}
        </div>
        {selectedCount > 0 && (
          <>
            <Separator />
            <button
              type="button"
              onClick={clear}
              className="w-full px-2 py-2 text-center text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-brand-800"
            >
              Limpar filtro
            </button>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
