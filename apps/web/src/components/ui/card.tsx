import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Weiße Karte auf warmem Canvas – Trennung ausschließlich über den
 * Tonunterschied. Keine Schatten, keine Borders (Design-System).
 */
function Card({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-(--radius-card) bg-surface p-6", className)}
      {...props}
    />
  );
}

export { Card };
