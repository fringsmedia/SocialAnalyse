import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "tnum inline-flex h-7 shrink-0 items-center gap-1 rounded-full px-3 text-[13px] font-semibold",
  {
    variants: {
      variant: {
        /** Standard für Scores/Outlier-Faktoren – schwarzes Gegengewicht. */
        dark: "bg-ink text-white",
        /** Akzent, sparsam: die eine Hervorhebung pro Fläche. */
        accent: "bg-accent text-white",
        neutral: "bg-surface-2 text-ink",
      },
    },
    defaultVariants: {
      variant: "dark",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
