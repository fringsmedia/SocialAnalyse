import * as React from "react";
import { cn } from "@/lib/utils";

interface StatusDotsProps {
  /** Anzahl Schritte gesamt. */
  total: number;
  /** Abgeschlossene Schritte. */
  done: number;
  /** Optional: gerade laufender Schritt (0-basiert). */
  activeIndex?: number;
  label?: string;
  className?: string;
}

/** Punkt-Raster für Phasen-Status (z. B. 3 von 7 Pipeline-Phasen). */
function StatusDots({
  total,
  done,
  activeIndex,
  label,
  className,
}: StatusDotsProps) {
  return (
    <div
      className={cn("flex items-center gap-1.5", className)}
      role="img"
      aria-label={label ?? `${done} von ${total} abgeschlossen`}
    >
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={cn(
            "size-2 rounded-full transition-colors duration-300",
            i < done
              ? "bg-accent"
              : i === activeIndex
                ? "bg-ink"
                : "bg-ink/15",
          )}
        />
      ))}
    </div>
  );
}

export { StatusDots };
