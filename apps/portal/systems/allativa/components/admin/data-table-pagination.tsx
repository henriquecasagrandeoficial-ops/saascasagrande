"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@allativa/components/ui/button";
import { cn } from "@allativa/lib/utils";

interface DataTablePaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  className?: string;
}

/** Paginação client-side sobre o resultado já filtrado da Data Table. */
export function DataTablePagination({
  page,
  pageSize,
  total,
  onPageChange,
  className,
}: DataTablePaginationProps) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), pageCount);
  const from = total === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const to = Math.min(safePage * pageSize, total);

  if (total <= pageSize) return null;

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 border-t border-slate-200 px-4 py-3 text-sm text-slate-500",
        className
      )}
    >
      <span>
        {from}–{to} de {total}
      </span>
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8"
          disabled={safePage <= 1}
          onClick={() => onPageChange(safePage - 1)}
          aria-label="Página anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="min-w-[4.5rem] text-center text-xs">
          {safePage} / {pageCount}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8"
          disabled={safePage >= pageCount}
          onClick={() => onPageChange(safePage + 1)}
          aria-label="Próxima página"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export const DEFAULT_PAGE_SIZE = 25;
