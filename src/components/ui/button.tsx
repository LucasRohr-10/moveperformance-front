import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/cn";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded font-semibold uppercase tracking-[0.2em] transition-colors disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-white text-black hover:bg-neutral-200",
        secondary: "border border-line text-white hover:bg-card",
        ghost: "text-muted hover:text-white",
        // Same three-opacity treatment as `StatusBadge`'s danger tone.
        destructive: "border border-danger/30 bg-danger/10 text-danger hover:bg-danger/20",
      },
      size: {
        sm: "px-3 py-1.5 text-[10px]",
        md: "px-5 py-2.5 text-[10px]",
      },
      fullWidth: {
        true: "w-full",
      },
      // Both sizes render under the 44px touch minimum. Opt in to reach it on
      // mobile only. Opt-in rather than default so the rendering of the
      // screens built against the current sizes does not change here.
      touchTarget: {
        true: "min-h-11 sm:min-h-0",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export function Button({
  className,
  variant,
  size,
  fullWidth,
  touchTarget,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        buttonVariants({ variant, size, fullWidth, touchTarget }),
        className,
      )}
      {...props}
    />
  );
}
