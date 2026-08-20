import * as React from "react";
import { cn } from "@/lib/utils";

interface ProgressRingProps {
  /** Fortschritt 0–1. */
  value: number;
  /** Durchmesser in px. */
  size?: number;
  strokeWidth?: number;
  label?: string;
  className?: string;
}

/**
 * Dünner Ringfortschritt: Koralle auf Hellgrau
 * (Statusanzeigen-Sprache des Design-Systems).
 */
function ProgressRing({
  value,
  size = 56,
  strokeWidth = 3,
  label,
  className,
}: ProgressRingProps) {
  const clamped = Math.min(Math.max(value, 0), 1);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - clamped);

  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamped * 100)}
      aria-label={label}
      className={cn("relative inline-grid place-items-center", className)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--color-surface-2)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-700 ease-(--ease-out-quart)"
        />
      </svg>
      <span className="tnum absolute text-[13px] font-semibold">
        {Math.round(clamped * 100)}
      </span>
    </div>
  );
}

export { ProgressRing };
