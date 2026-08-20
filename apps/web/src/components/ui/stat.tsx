import * as React from "react";
import { cn } from "@/lib/utils";

interface StatProps {
  value: string;
  label: string;
  className?: string;
}

/** Kennzahl: 32–40 px medium, tabellarische Ziffern, 13-px-Label. */
function Stat({ value, label, className }: StatProps) {
  return (
    <div className={cn("space-y-1", className)}>
      <div className="tnum text-[2rem] font-medium leading-none tracking-tight md:text-[2.5rem]">
        {value}
      </div>
      <div className="text-[13px] font-medium text-ink-2">{label}</div>
    </div>
  );
}

export { Stat };
