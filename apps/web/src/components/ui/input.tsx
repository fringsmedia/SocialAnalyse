import * as React from "react";
import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

function Input({ className, ...props }: InputProps) {
  return (
    <input
      className={cn(
        "h-12 w-full rounded-full bg-surface-2 px-5 text-[15px] text-ink",
        "placeholder:text-ink-2",
        "transition-shadow duration-300 ease-(--ease-out-quart)",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink",
        "disabled:pointer-events-none disabled:opacity-40",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
