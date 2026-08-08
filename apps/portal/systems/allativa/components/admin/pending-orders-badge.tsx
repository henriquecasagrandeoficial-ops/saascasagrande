"use client";

import { cn } from "@allativa/lib/utils";
import { usePendingOrderCount } from "@allativa/hooks/use-pending-orders";

interface PendingOrdersBadgeProps {
  collapsed?: boolean;
}

export function PendingOrdersBadge({ collapsed }: PendingOrdersBadgeProps) {
  const { count } = usePendingOrderCount();

  if (count <= 0) return null;

  return (
    <>
      <span
        className={cn(
          "ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-bold text-white",
          collapsed && "lg:hidden"
        )}
      >
        {count > 99 ? "99+" : count}
      </span>

      {collapsed && (
        <span
          aria-hidden="true"
          className="absolute right-2 top-1.5 hidden h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-stone-900 lg:block"
        />
      )}
    </>
  );
}
