"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { ArrowDown, ArrowUp, ChevronsUpDown, Search } from "lucide-react";

import { formatPrice } from "@allativa/lib/format";
import type { CatalogProductSales } from "@allativa/lib/dashboard-metrics";
import { cn } from "@allativa/lib/utils";
import { Input } from "@allativa/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@allativa/components/ui/table";

type SortKey = "quantity" | "revenue" | "profit";
type SortDirection = "asc" | "desc";

interface CatalogSalesTableProps {
  data: CatalogProductSales[];
}

const numberFormatter = new Intl.NumberFormat("pt-BR");

export function CatalogSalesTable({ data }: CatalogSalesTableProps) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("quantity");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDirection("desc");
    }
  }

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase();
    const filtered = query
      ? data.filter(
          (row) =>
            row.title.toLowerCase().includes(query) ||
            row.categoryName.toLowerCase().includes(query)
        )
      : data;

    const sorted = [...filtered].sort((a, b) => {
      const diff = a[sortKey] - b[sortKey];
      return sortDirection === "asc" ? diff : -diff;
    });

    return sorted;
  }, [data, search, sortKey, sortDirection]);

  const SortIcon = ({ column }: { column: SortKey }) => {
    if (column !== sortKey) {
      return <ChevronsUpDown className="h-3.5 w-3.5 text-slate-400" />;
    }
    return sortDirection === "asc" ? (
      <ArrowUp className="h-3.5 w-3.5 text-brand-600" />
    ) : (
      <ArrowDown className="h-3.5 w-3.5 text-brand-600" />
    );
  };

  const SortableHead = ({
    column,
    children,
  }: {
    column: SortKey;
    children: React.ReactNode;
  }) => (
    <TableHead className="text-right">
      <button
        type="button"
        onClick={() => toggleSort(column)}
        className={cn(
          "ml-auto flex items-center gap-1 font-medium transition-colors hover:text-brand-700",
          column === sortKey ? "text-brand-700" : "text-slate-500"
        )}
      >
        {children}
        <SortIcon column={column} />
      </button>
    </TableHead>
  );

  return (
    <div className="space-y-3">
      <div className="relative max-w-xs">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          type="search"
          placeholder="Buscar peça ou categoria..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="bg-white pl-9"
        />
      </div>

      <div className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-14">Foto</TableHead>
              <TableHead>Peça</TableHead>
              <TableHead>Categoria</TableHead>
              <SortableHead column="quantity">Vendas</SortableHead>
              <SortableHead column="revenue">Receita</SortableHead>
              <SortableHead column="profit">Lucro</SortableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-10 text-center text-slate-500"
                >
                  Nenhuma peça encontrada.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.productId}>
                  <TableCell>
                    <div className="relative h-10 w-10 overflow-hidden rounded-md border border-slate-200 bg-slate-50">
                      <Image
                        src={row.imageUrl}
                        alt={row.title}
                        fill
                        sizes="40px"
                        className="object-cover"
                      />
                    </div>
                  </TableCell>
                  <TableCell className="font-medium text-slate-900">
                    {row.title}
                  </TableCell>
                  <TableCell className="text-slate-500">
                    {row.categoryName}
                  </TableCell>
                  <TableCell className="text-right font-medium text-slate-700">
                    {numberFormatter.format(row.quantity)}
                  </TableCell>
                  <TableCell className="text-right font-semibold text-brand-700">
                    {formatPrice(row.revenue)}
                  </TableCell>
                  <TableCell
                    className={cn(
                      "text-right font-semibold",
                      row.profit > 0
                        ? "text-green-700"
                        : row.profit < 0
                          ? "text-red-600"
                          : "text-slate-500"
                    )}
                  >
                    {formatPrice(row.profit)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
