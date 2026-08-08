import Link from "next/link";

import { cn } from "@allativa/lib/utils";
import { ORDER_PERIODS, type OrderPeriod } from "@allativa/lib/order-period";

interface OrderPeriodFilterProps {
  current: OrderPeriod;
}

export function OrderPeriodFilter({ current }: OrderPeriodFilterProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {ORDER_PERIODS.map(({ value, label }) => (
        <Link
          key={value}
          href={`/allativa/painel/pedidos/historico?period=${value}`}
          className={cn(
            "rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors",
            current === value
              ? "border-brand-600 bg-brand-600 text-white"
              : "border-stone-200 bg-white text-stone-600 hover:border-brand-300 hover:text-brand-700"
          )}
        >
          {label}
        </Link>
      ))}
    </div>
  );
}
