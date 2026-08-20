import * as React from "react";
import { cn } from "@/lib/utils";

export type LabelProps = React.LabelHTMLAttributes<HTMLLabelElement>;

function Label({ className, ...props }: LabelProps) {
  return (
    <label
      className={cn("block text-[13px] font-medium text-ink-2", className)}
      {...props}
    />
  );
}

export { Label };
