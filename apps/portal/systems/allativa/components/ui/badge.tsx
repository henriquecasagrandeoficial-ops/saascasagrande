import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@allativa/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-sm border px-2 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-brand-600 text-white shadow-sm hover:bg-brand-700",
        secondary:
          "border-transparent bg-slate-100 text-slate-700 hover:bg-slate-200",
        outline: "border-slate-200 text-slate-700",
        brand:
          "border-brand-200 bg-brand-50 text-brand-800 hover:bg-brand-100",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
