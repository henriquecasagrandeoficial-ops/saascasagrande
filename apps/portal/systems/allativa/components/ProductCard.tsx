"use client";

import { useState } from "react";
import Image from "next/image";

import { formatPrice } from "@allativa/lib/format";
import { cn } from "@allativa/lib/utils";

export interface ProductCardData {
  title: string;
  description?: string | null;
  imageUrl: string;
  price: number;
  /** Uso interno (PDV / admin) — não exibido na vitrine pública. */
  productCode?: string | null;
  categoryName?: string;
}

interface ProductCardProps {
  product: ProductCardData;
  /** Se definido, o card vira botão clicável (ex.: adicionar ao carrinho no PDV). */
  onClick?: () => void;
  /** Cards menores para balcão / PDV (mais peças na tela). */
  compact?: boolean;
  className?: string;
}

export function ProductCard({
  product,
  onClick,
  compact = false,
  className,
}: ProductCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const description = product.description?.trim() ?? "";
  const canToggleDescription = !compact && description.length > 70;

  const content = (
    <>
      {/* 1. Foto */}
      <div
        className={cn(
          "relative w-full overflow-hidden bg-slate-50",
          compact ? "aspect-square" : "aspect-[4/5]"
        )}
      >
        <Image
          src={product.imageUrl}
          alt={product.title}
          fill
          sizes={
            compact
              ? "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              : "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
          }
          className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        />
      </div>

      {/* 2–4. Título → Descrição → Valor */}
      <div
        className={cn(
          "flex flex-1 flex-col",
          compact ? "gap-0.5 p-2" : "gap-1.5 p-3 sm:gap-2 sm:p-4"
        )}
      >
        {product.productCode ? (
          <span
            className={cn(
              "font-mono leading-none text-slate-400",
              compact ? "text-[9px]" : "text-[10px] sm:text-xs"
            )}
          >
            {product.productCode}
          </span>
        ) : null}

        <h3
          className={cn(
            "font-semibold leading-snug text-slate-900",
            compact
              ? "line-clamp-2 text-xs"
              : "line-clamp-2 text-sm sm:text-base"
          )}
        >
          {product.title}
        </h3>

        {!compact && description ? (
          <div className="min-w-0">
            <p
              className={cn(
                "text-xs leading-relaxed text-slate-500",
                !isExpanded && "line-clamp-2"
              )}
            >
              {description}
            </p>
            {canToggleDescription ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  setIsExpanded((v) => !v);
                }}
                className="mt-0.5 text-xs font-medium text-brand-600 underline-offset-2 hover:underline"
              >
                {isExpanded ? "Ler menos" : "Ler mais"}
              </button>
            ) : null}
          </div>
        ) : product.categoryName ? (
          <p className="line-clamp-1 text-[10px] text-slate-400 sm:text-xs">
            {product.categoryName}
          </p>
        ) : null}

        <p
          className={cn(
            "mt-auto font-bold text-brand-600",
            compact ? "pt-0.5 text-xs sm:text-sm" : "pt-1 text-sm sm:text-base"
          )}
        >
          {formatPrice(product.price)}
        </p>
      </div>
    </>
  );

  const shellClass = cn(
    "group flex h-full flex-col overflow-hidden border border-slate-200/60 bg-white text-left transition-shadow duration-300 hover:shadow-sm",
    compact ? "rounded-lg" : "rounded-xl",
    onClick && "active:scale-[0.98]",
    className
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={shellClass}>
        {content}
      </button>
    );
  }

  return <article className={shellClass}>{content}</article>;
}
