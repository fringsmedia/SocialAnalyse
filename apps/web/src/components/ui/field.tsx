import * as React from "react";
import { cn } from "@/lib/utils";
import { Label } from "./label";

interface FieldProps {
  label: string;
  htmlFor: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}

/** Label + Control + Fehlermeldung als konsistente Einheit. */
function Field({ label, htmlFor, error, className, children }: FieldProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error ? (
        <p role="alert" className="px-1 text-[13px] font-medium text-accent">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export { Field };
