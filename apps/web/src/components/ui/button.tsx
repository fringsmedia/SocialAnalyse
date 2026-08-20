import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  [
    "inline-flex shrink-0 select-none items-center justify-center gap-2",
    "whitespace-nowrap rounded-full font-medium",
    "transition-[background-color,transform,opacity] duration-300 ease-(--ease-out-quart)",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
    "active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40",
  ],
  {
    variants: {
      variant: {
        /** Primäraktion – die eine Akzentfarbe. */
        primary: "bg-accent text-white hover:bg-accent-hover",
        /** Sekundäre Primäraktion – schwarze Pill. */
        dark: "bg-ink text-white hover:bg-[#2b2b2b]",
        /** Zurückhaltend auf Flächen. */
        subtle: "bg-surface-2 text-ink hover:bg-[#e4e4e2]",
        /** Nur Text, Hover als Fläche. */
        ghost: "text-ink hover:bg-surface-2",
      },
      size: {
        sm: "h-9 px-4 text-sm",
        md: "h-11 px-5 text-[15px]",
        lg: "h-12 px-7 text-base",
        /** Kreisrunder Icon-Button, 48 px. */
        icon: "size-12 p-0",
        iconSm: "size-9 p-0",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

function Button({
  className,
  variant,
  size,
  asChild = false,
  type,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      className={cn(buttonVariants({ variant, size }), className)}
      type={asChild ? undefined : (type ?? "button")}
      {...props}
    />
  );
}

export { Button, buttonVariants };
