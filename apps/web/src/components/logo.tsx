import * as React from "react";
import { PRODUCT_NAME } from "@ci/shared";
import { cn } from "@/lib/utils";

/**
 * Logo: schwarzes Kreis-Element mit Korall-Punkt (Blenden-Motiv),
 * daneben der Produktname als Wortmarke.
 */
function LogoMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "relative grid size-8 shrink-0 place-items-center rounded-full bg-ink",
        className,
      )}
    >
      <span className="absolute right-[5px] size-2.5 rounded-full bg-accent" />
    </span>
  );
}

function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-3", className)}>
      <LogoMark />
      <span className="text-[15px] font-medium tracking-tight">
        {PRODUCT_NAME}
      </span>
    </span>
  );
}

export { Logo, LogoMark };
