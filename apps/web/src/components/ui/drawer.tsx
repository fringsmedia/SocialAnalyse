"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/lib/utils";

/**
 * Rechtsseitiger Detail-Drawer (Radix Dialog). Panel mit großem
 * Radius links, ohne Schatten – Trennung über den Overlay-Scrim.
 */
function Drawer({
  open,
  onOpenChange,
  title,
  children,
  closeLabel = "Schließen",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: React.ReactNode;
  closeLabel?: string;
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-ink/25 animate-overlay-in" />
        <DialogPrimitive.Content
          className={cn(
            "fixed inset-y-0 right-0 z-50 w-full max-w-xl overflow-y-auto",
            "bg-surface p-8 md:rounded-l-(--radius-container) md:p-10",
            "animate-drawer-in focus:outline-none",
          )}
        >
          <DialogPrimitive.Title className="sr-only">
            {title}
          </DialogPrimitive.Title>
          {children}
          <DialogPrimitive.Close
            aria-label={closeLabel}
            className={cn(
              "absolute right-5 top-5 grid size-9 place-items-center rounded-full",
              "bg-surface text-ink-2 transition-colors duration-200 hover:bg-surface-2 hover:text-ink",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
            )}
          >
            <X size={16} weight="bold" />
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export { Drawer };
