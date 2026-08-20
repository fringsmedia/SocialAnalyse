import * as React from "react";
import { cn } from "@/lib/utils";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

function Textarea({ className, ...props }: TextareaProps) {
  return (
    <textarea
      className={cn(
        "min-h-28 w-full resize-y rounded-[20px] bg-surface-2 p-5 text-[15px] text-ink",
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

export { Textarea };
