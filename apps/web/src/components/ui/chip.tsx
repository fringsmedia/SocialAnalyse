"use client";

import * as React from "react";
import { X } from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/lib/utils";

interface ChipProps {
  children: React.ReactNode;
  selected?: boolean;
  onRemove?: () => void;
  removeLabel?: string;
  className?: string;
}

/**
 * Pill-Chip für Keywords, Hashtags, Filter. Mit onRemove erscheint
 * ein x-Button (Filter-Sprache des Design-Systems).
 */
function Chip({
  children,
  selected = false,
  onRemove,
  removeLabel = "Entfernen",
  className,
}: ChipProps) {
  return (
    <span
      className={cn(
        "inline-flex h-9 shrink-0 items-center gap-1 rounded-full text-sm font-medium",
        selected ? "bg-ink text-white" : "bg-surface-2 text-ink",
        onRemove ? "pl-4 pr-1.5" : "px-4",
        className,
      )}
    >
      {children}
      {onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          aria-label={removeLabel}
          className={cn(
            "grid size-6 place-items-center rounded-full transition-colors duration-200",
            selected
              ? "text-white/70 hover:bg-white/15 hover:text-white"
              : "text-ink-2 hover:bg-ink/10 hover:text-ink",
          )}
        >
          <X size={12} weight="bold" />
        </button>
      ) : null}
    </span>
  );
}

export { Chip };
