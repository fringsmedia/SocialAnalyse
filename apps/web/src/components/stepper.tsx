import * as React from "react";
import { Check } from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/lib/utils";

interface StepperProps {
  steps: readonly string[];
  /** 0-basierter Index des aktiven Schritts. */
  active: number;
  className?: string;
}

/** Dreistufige Fortschrittsanzeige für den Anlage-Flow. */
function Stepper({ steps, active, className }: StepperProps) {
  return (
    <ol className={cn("flex flex-wrap items-center gap-x-6 gap-y-2", className)}>
      {steps.map((label, i) => {
        const done = i < active;
        const current = i === active;
        return (
          <li key={label} className="flex items-center gap-2.5">
            <span
              className={cn(
                "tnum grid size-7 place-items-center rounded-full text-[13px] font-semibold",
                done && "bg-accent text-white",
                current && "bg-ink text-white",
                !done && !current && "bg-surface-2 text-ink-2",
              )}
            >
              {done ? <Check size={13} weight="bold" /> : i + 1}
            </span>
            <span
              className={cn(
                "text-sm font-medium",
                current ? "text-ink" : "text-ink-2",
              )}
            >
              {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export { Stepper };
