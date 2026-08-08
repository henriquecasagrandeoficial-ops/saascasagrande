"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Pencil } from "lucide-react";
import type { Category } from "@prisma/client";

import { formatPrice } from "@/lib/format";
import { deleteProduct } from "@/app/painel/produtos/actions";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DeleteConfirmDialog } from "@/components/admin/delete-confirm-dialog";
import { DataTableFacetedFilter } from "@/components/admin/data-table-faceted-filter";
import {
  DataTablePagination,
  DEFAULT_PAGE_SIZE,
} from "@/components/admin/data-table-pagination";
import { DataTableToolbar } from "@/components/admin/data-table-toolbar";
import { ProductFormSheet, type ProductFormModel } from "./product-form-sheet";

export type ProductRow = ProductFormModel & { category: Category | null };

function normalize(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

interface ProdutosTableProps {
  products: ProductRow[];
  categories: Category[];
}

export function ProdutosTable({ products, categories }: ProdutosTableProps) {
  const [search, setSearch] = useState("");
  const [categoryIds, setCategoryIds] = useState<Set<string>>(new Set());
  const [statuses, setStatuses] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);

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
    for (const p of products) {
      if (p.isAvailable) available += 1;
      else unavailable += 1;
    }
    return [
      { value: "available", label: "Disponível", count: available },
      { value: "unavailable", label: "Indisponível", count: unavailable },
    ].filter((o) => o.count > 0);
  }, [products]);

  const filtered = useMemo(() => {
    const q = normalize(search);
    return products.filter((p) => {
      if (categoryIds.size > 0) {
        if (!p.categoryId || !categoryIds.has(p.categoryId)) return false;
      }

      if (statuses.size > 0) {
        const key = p.isAvailable ? "available" : "unavailable";
        if (!statuses.has(key)) return false;
      }

      if (!q) return true;
      const haystack = normalize(
        [p.title, p.productCode ?? "", p.category?.name ?? ""].join(" ")
      );
      return haystack.includes(q);
    });
  }, [products, search, categoryIds, statuses]);

  // Volta à página 1 quando filtros mudam.
  useEffect(() => {
    setPage(1);
  }, [search, categoryIds, statuses]);

  const pageSize = DEFAULT_PAGE_SIZE;
  const pageItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  const hasActiveFilters =
    search.trim().length > 0 || categoryIds.size > 0 || statuses.size > 0;

  function resetFilters() {
    setSearch("");
    setCategoryIds(new Set());
    setStatuses(new Set());
    setPage(1);
  }

  return (
    <div className="overflow-hidden rounded-md border border-stone-200 bg-white shadow-sm">
      <DataTableToolbar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar por nome ou código (SKU)..."
        hasActiveFilters={hasActiveFilters}
        onReset={resetFilters}
        resultCount={filtered.length}
        totalCount={products.length}
        className="border-stone-200 bg-stone-50/50"
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

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-20">Imagem</TableHead>
            <TableHead className="w-28">Código</TableHead>
            <TableHead>Título</TableHead>
            <TableHead>Categoria</TableHead>
            <TableHead>Preço</TableHead>
            <TableHead className="text-center">Status</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pageItems.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={7}
                className="py-10 text-center text-stone-500"
              >
                {products.length === 0
                  ? "Nenhum produto cadastrado."
                  : "Nenhum produto corresponde aos filtros."}
              </TableCell>
            </TableRow>
          ) : (
            pageItems.map((product) => (
              <TableRow key={product.id}>
                <TableCell>
                  <div className="relative h-12 w-16 overflow-hidden rounded-md bg-stone-100">
                    <Image
                      src={product.imageUrl}
                      alt={product.title}
                      fill
                      sizes="64px"
                      className="object-cover"
                    />
                  </div>
                </TableCell>
                <TableCell className="font-mono text-xs text-stone-500">
                  {product.productCode ?? "—"}
                </TableCell>
                <TableCell className="font-medium text-stone-800">
                  {product.title}
                </TableCell>
                <TableCell className="text-stone-600">
                  {product.category?.name ?? "Sem categoria"}
                </TableCell>
                <TableCell className="font-semibold text-brand-700">
                  {formatPrice(product.price)}
                </TableCell>
                <TableCell className="text-center">
                  {product.isAvailable ? (
                    <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
                      Disponível
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-stone-200 px-2.5 py-0.5 text-xs font-medium text-stone-600">
                      Indisponível
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-1">
                    <ProductFormSheet
                      product={product}
                      categories={categories}
                      trigger={
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Editar"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      }
                    />
                    <DeleteConfirmDialog
                      title="Excluir produto"
                      description={`Tem certeza que deseja excluir "${product.title}"? A peça sumirá do catálogo e do PDV, mas o histórico de vendas será preservado.`}
                      onConfirm={deleteProduct.bind(null, product.id)}
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <DataTablePagination
        page={page}
        pageSize={pageSize}
        total={filtered.length}
        onPageChange={setPage}
        className="border-stone-200"
      />
    </div>
  );
}
