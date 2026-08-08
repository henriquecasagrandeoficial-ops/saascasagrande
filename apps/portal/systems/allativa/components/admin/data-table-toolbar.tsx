"use client";

import { Search, X } from "lucide-react";

import { Button } from "@allativa/components/ui/button";
import { Input } from "@allativa/components/ui/input";
import { cn } from "@allativa/lib/utils";

interface DataTableToolbarProps {
  /** Texto da busca livre. */
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  /** Filtros facetados (botões) à direita da busca. */
  children?: React.ReactNode;
  /** Há algum filtro (texto ou faceta) ativo? */
  hasActiveFilters: boolean;
  onReset: () => void;
  /** Contagem “X de Y” exibida no canto. */
  resultCount?: number;
  totalCount?: number;
  className?: string;
}

/**
 * Toolbar responsiva para Data Tables: busca global + facetas + limpar.
 */
export function DataTableToolbar({
  search,
  onSearchChange,
  searchPlaceholder = "Buscar por nome...",
  children,
  hasActiveFilters,
  onReset,
  resultCount,
  totalCount,
  className,
}: DataTableToolbarProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 border-b border-slate-200 bg-slate-50/50 p-4",
        className
      )}
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              type="search"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="h-9 bg-white pl-8"
              aria-label="Buscar insumos"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">{children}</div>
        </div>

        <div className="flex items-center gap-2 self-start lg:self-auto">
          {typeof resultCount === "number" &&
            typeof totalCount === "number" && (
              <span className="text-xs text-slate-500">
                {resultCount === totalCount
                  ? `${totalCount} item(ns)`
                  : `${resultCount} de ${totalCount}`}
              </span>
            )}
          {hasActiveFilters && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onReset}
              className="h-9 px-2 text-slate-600 hover:text-brand-800"
            >
              Limpar filtros
              <X className="ml-1 h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
