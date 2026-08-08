"use client";

import { useMemo, useState, useTransition } from "react";
import {
  CheckCircle2,
  ChevronDown,
  Loader2,
  Minus,
  PackagePlus,
  Plus,
  ShoppingCart,
  Trash2,
} from "lucide-react";

import { createOrder } from "@/app/allativa/painel/pedidos/actions";
import { DataTableFacetedFilter } from "@allativa/components/admin/data-table-faceted-filter";
import { DataTableToolbar } from "@allativa/components/admin/data-table-toolbar";
import { ProductCard } from "@allativa/components/ProductCard";
import { formatPhone, formatPrice } from "@allativa/lib/format";
import { cn } from "@allativa/lib/utils";
import { Button } from "@allativa/components/ui/button";
import { Input } from "@allativa/components/ui/input";
import { Label } from "@allativa/components/ui/label";

/** Converte o texto digitado no campo de sinal em número (aceita vírgula). */
function parseCurrencyInput(value: string): number {
  const normalized = value.replace(/\./g, "").replace(",", ".").trim();
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function normalize(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/** Faixas de preço para filtro facetado no PDV. */
const PRICE_BANDS = [
  { value: "0-500", label: "Até R$ 500", min: 0, max: 500 },
  { value: "500-1500", label: "R$ 500 – 1.500", min: 500, max: 1500 },
  { value: "1500-3000", label: "R$ 1.500 – 3.000", min: 1500, max: 3000 },
  { value: "3000+", label: "Acima de R$ 3.000", min: 3000, max: Infinity },
] as const;

function priceBandOf(price: number): string {
  for (const band of PRICE_BANDS) {
    if (price >= band.min && price < band.max) return band.value;
  }
  return "3000+";
}

export type PdvProduct = {
  id: string;
  title: string;
  description: string;
  productCode: string | null;
  price: number;
  imageUrl: string;
  categoryName: string;
};

type CartLine = {
  productId: string;
  title: string;
  price: number;
  quantity: number;
};

interface PdvClientProps {
  products: PdvProduct[];
}

export function PdvClient({ products }: PdvClientProps) {
  const [search, setSearch] = useState("");
  const [categories, setCategories] = useState<Set<string>>(new Set());
  const [priceBands, setPriceBands] = useState<Set<string>>(new Set());
  const [customerName, setCustomerName] = useState("");
  const [sellerName, setSellerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [advanceInput, setAdvanceInput] = useState("");
  const [showExtraInfo, setShowExtraInfo] = useState(false);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const categoryOptions = useMemo(() => {
    const counts = new Map<string, { label: string; count: number }>();
    for (const p of products) {
      const key = normalize(p.categoryName);
      const prev = counts.get(key);
      if (prev) prev.count += 1;
      else counts.set(key, { label: p.categoryName, count: 1 });
    }
    return [...counts.entries()]
      .map(([value, { label, count }]) => ({ value, label, count }))
      .sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));
  }, [products]);

  const priceBandOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of products) {
      const key = priceBandOf(p.price);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return PRICE_BANDS.map((band) => ({
      value: band.value,
      label: band.label,
      count: counts.get(band.value) ?? 0,
    })).filter((o) => o.count > 0);
  }, [products]);

  const filteredProducts = useMemo(() => {
    const q = normalize(search);
    return products.filter((product) => {
      if (
        categories.size > 0 &&
        !categories.has(normalize(product.categoryName))
      ) {
        return false;
      }
      if (priceBands.size > 0 && !priceBands.has(priceBandOf(product.price))) {
        return false;
      }
      if (!q) return true;
      const haystack = normalize(
        [
          product.title,
          product.productCode ?? "",
          product.categoryName,
          product.description ?? "",
        ].join(" ")
      );
      return haystack.includes(q);
    });
  }, [products, search, categories, priceBands]);

  const hasActiveFilters =
    search.trim().length > 0 || categories.size > 0 || priceBands.size > 0;

  function resetFilters() {
    setSearch("");
    setCategories(new Set());
    setPriceBands(new Set());
  }

  const total = useMemo(
    () => cart.reduce((sum, line) => sum + line.price * line.quantity, 0),
    [cart]
  );

  const cartCount = useMemo(
    () => cart.reduce((sum, line) => sum + line.quantity, 0),
    [cart]
  );

  const advancePayment = useMemo(
    () => parseCurrencyInput(advanceInput),
    [advanceInput]
  );

  const advanceExceedsTotal = advancePayment > total + 0.001;
  const remaining = Math.max(0, total - advancePayment);

  function addToCart(product: PdvProduct) {
    setSuccessMessage(null);
    setError(null);
    setCart((current) => {
      const existing = current.find((line) => line.productId === product.id);
      if (existing) {
        return current.map((line) =>
          line.productId === product.id
            ? { ...line, quantity: line.quantity + 1 }
            : line
        );
      }
      return [
        ...current,
        {
          productId: product.id,
          title: product.title,
          price: product.price,
          quantity: 1,
        },
      ];
    });
  }

  function updateQuantity(productId: string, delta: number) {
    setCart((current) =>
      current
        .map((line) =>
          line.productId === productId
            ? { ...line, quantity: line.quantity + delta }
            : line
        )
        .filter((line) => line.quantity > 0)
    );
  }

  function removeFromCart(productId: string) {
    setCart((current) =>
      current.filter((line) => line.productId !== productId)
    );
  }

  function handleFinalize() {
    setError(null);
    setSuccessMessage(null);

    if (advanceExceedsTotal) {
      setError("O sinal não pode ser maior que o total do pedido.");
      return;
    }

    startTransition(async () => {
      const result = await createOrder({
        customerName,
        customerPhone: customerPhone || undefined,
        sellerName: sellerName || undefined,
        advancePayment,
        items: cart.map((line) => ({
          productId: line.productId,
          quantity: line.quantity,
        })),
      });

      if (result.error) {
        setError(result.error);
        return;
      }

      setSuccessMessage(
        "Venda registrada! O comprovante é impresso na aba Pedidos."
      );
      setCart([]);
      setCustomerName("");
      setSellerName("");
      setCustomerPhone("");
      setAdvanceInput("");
      setShowExtraInfo(false);
    });
  }

  return (
    <div className="flex flex-col gap-6 lg:grid lg:grid-cols-5">
      {/* Catálogo */}
      <section className="order-2 space-y-3 lg:order-1 lg:col-span-3">
        <DataTableToolbar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Buscar por nome, código (SKU) ou categoria…"
          hasActiveFilters={hasActiveFilters}
          onReset={resetFilters}
          resultCount={filteredProducts.length}
          totalCount={products.length}
          className="rounded-lg border border-stone-200 bg-white"
        >
          <DataTableFacetedFilter
            title="Categoria"
            options={categoryOptions}
            selected={categories}
            onSelectedChange={setCategories}
          />
          <DataTableFacetedFilter
            title="Faixa de preço"
            options={priceBandOptions}
            selected={priceBands}
            onSelectedChange={setPriceBands}
          />
        </DataTableToolbar>

        {filteredProducts.length === 0 ? (
          <p className="rounded-md border border-dashed border-stone-300 bg-white py-12 text-center text-sm text-stone-500">
            Nenhuma peça encontrada.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                compact
                onClick={() => addToCart(product)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Venda */}
      <aside className="order-1 lg:order-2 lg:col-span-2">
        <div className="space-y-4 rounded-md border border-stone-200 bg-white p-4 shadow-sm sm:p-5 lg:sticky lg:top-4">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-stone-800">
              <ShoppingCart className="h-5 w-5 text-brand-600" />
              Venda
            </h2>
            {cartCount > 0 && (
              <span className="rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-medium text-brand-700">
                {cartCount} {cartCount === 1 ? "item" : "itens"}
              </span>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="customerName">Nome do cliente</Label>
            <Input
              id="customerName"
              placeholder="Ex.: Maria Silva"
              value={customerName}
              onChange={(event) => setCustomerName(event.target.value)}
              disabled={isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sellerName">Vendedor(a) (opcional)</Label>
            <Input
              id="sellerName"
              placeholder="Ex.: Ana"
              value={sellerName}
              onChange={(event) => setSellerName(event.target.value)}
              disabled={isPending}
            />
          </div>

          {/* Seção expansível para encomendas (WhatsApp + sinal). */}
          <div className="rounded-lg border border-stone-200">
            <button
              type="button"
              onClick={() => setShowExtraInfo((open) => !open)}
              aria-expanded={showExtraInfo}
              aria-controls="extra-info-panel"
              className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50"
            >
              <span className="flex items-center gap-2">
                <PackagePlus className="h-4 w-4 text-brand-600" />
                Informações Adicionais / Encomenda
              </span>
              <ChevronDown
                className={cn(
                  "h-4 w-4 shrink-0 text-stone-400 transition-transform",
                  showExtraInfo && "rotate-180"
                )}
              />
            </button>

            {showExtraInfo && (
              <div
                id="extra-info-panel"
                className="space-y-3 border-t border-stone-100 p-3"
              >
                <div className="space-y-2">
                  <Label htmlFor="customerPhone">WhatsApp (opcional)</Label>
                  <Input
                    id="customerPhone"
                    type="tel"
                    inputMode="numeric"
                    placeholder="(11) 99999-9999"
                    value={customerPhone}
                    onChange={(event) =>
                      setCustomerPhone(formatPhone(event.target.value))
                    }
                    disabled={isPending}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="advancePayment">
                    Valor pago como sinal (R$)
                  </Label>
                  <Input
                    id="advancePayment"
                    type="text"
                    inputMode="decimal"
                    placeholder="0,00"
                    value={advanceInput}
                    onChange={(event) => setAdvanceInput(event.target.value)}
                    disabled={isPending}
                    aria-invalid={advanceExceedsTotal}
                  />
                  {advanceExceedsTotal && (
                    <p className="text-xs text-red-600">
                      O sinal não pode ser maior que o total do pedido.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {successMessage && (
            <div className="flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              {successMessage}
            </div>
          )}

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </p>
          )}

          <div className="max-h-64 space-y-2 overflow-y-auto">
            {cart.length === 0 ? (
              <p className="py-6 text-center text-sm text-stone-400">
                Clique em uma peça para adicionar à venda.
              </p>
            ) : (
              cart.map((line) => (
                <div
                  key={line.productId}
                  className="flex items-center gap-2 rounded-lg border border-stone-100 bg-stone-50 p-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-stone-800">
                      {line.title}
                    </p>
                    <p className="text-xs text-brand-700">
                      {formatPrice(line.price)}
                    </p>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => updateQuantity(line.productId, -1)}
                      disabled={isPending}
                      aria-label="Diminuir quantidade"
                      className="rounded-md p-1 text-stone-500 hover:bg-stone-200"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="w-6 text-center text-sm font-medium">
                      {line.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateQuantity(line.productId, 1)}
                      disabled={isPending}
                      aria-label="Aumentar quantidade"
                      className="rounded-md p-1 text-stone-500 hover:bg-stone-200"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeFromCart(line.productId)}
                      disabled={isPending}
                      aria-label="Remover item"
                      className="rounded-md p-1 text-red-500 hover:bg-red-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="space-y-1.5 border-t border-stone-200 pt-3">
            {advancePayment > 0 ? (
              <>
                <div className="flex items-center justify-between text-sm text-stone-600">
                  <span>Valor Total</span>
                  <span className="font-medium">{formatPrice(total)}</span>
                </div>
                <div className="flex items-center justify-between text-sm text-emerald-700">
                  <span>Sinal</span>
                  <span className="font-medium">
                    - {formatPrice(advancePayment)}
                  </span>
                </div>
                <div className="flex items-center justify-between border-t border-stone-100 pt-1.5">
                  <span className="text-sm font-medium text-stone-600">
                    Restante a Pagar
                  </span>
                  <span className="text-xl font-bold text-brand-700">
                    {formatPrice(remaining)}
                  </span>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-stone-600">
                  Total
                </span>
                <span className="text-xl font-bold text-brand-700">
                  {formatPrice(total)}
                </span>
              </div>
            )}
          </div>

          <Button
            type="button"
            onClick={handleFinalize}
            disabled={
              isPending ||
              cart.length === 0 ||
              !customerName.trim() ||
              advanceExceedsTotal
            }
            className={cn(
              "w-full bg-brand-600 text-white hover:bg-brand-700",
              "disabled:opacity-50"
            )}
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : (
              "Enviar Pedido"
            )}
          </Button>
        </div>
      </aside>
    </div>
  );
}
