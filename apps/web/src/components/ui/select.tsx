"use client";

import * as React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { CaretDown, Check } from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/lib/utils";

/**
 * Dropdown als Pill mit Chevron (Komponenten-Sprache des Design-Systems).
 * Das schwebende Panel trennt sich über eine Haarlinie (ink/8) – die
 * einzige zulässige "Border" im System, weil Ton-auf-Ton hier nicht trägt.
 */

const Select = SelectPrimitive.Root;
const SelectValue = SelectPrimitive.Value;

function SelectTrigger({
  className,
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Trigger>) {
  return (
    <SelectPrimitive.Trigger
      className={cn(
        "inline-flex h-11 shrink-0 items-center justify-between gap-2 rounded-full",
        "bg-surface-2 pl-5 pr-4 text-[15px] font-medium text-ink",
        "transition-colors duration-300 ease-(--ease-out-quart) hover:bg-[#e4e4e2]",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
        "disabled:pointer-events-none disabled:opacity-40",
        "data-[placeholder]:text-ink-2",
        className,
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        <CaretDown size={14} weight="bold" className="text-ink-2" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
}

function SelectContent({
  className,
  children,
  position = "popper",
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Content>) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        position={position}
        sideOffset={8}
        className={cn(
          "z-50 min-w-[var(--radix-select-trigger-width)] overflow-hidden",
          "rounded-[20px] bg-surface p-1.5 ring-1 ring-ink/8",
          "animate-panel-in",
          className,
        )}
        {...props}
      >
        <SelectPrimitive.Viewport>{children}</SelectPrimitive.Viewport>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  );
}

function SelectItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item
      className={cn(
        "flex h-10 cursor-default select-none items-center justify-between gap-3",
        "rounded-full px-4 text-[15px] outline-none",
        "data-[highlighted]:bg-surface-2",
        "data-[disabled]:pointer-events-none data-[disabled]:opacity-40",
        className,
      )}
      {...props}
    >
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
      <SelectPrimitive.ItemIndicator>
        <Check size={14} weight="bold" className="text-accent" />
      </SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
  );
}

export { Select, SelectContent, SelectItem, SelectTrigger, SelectValue };
