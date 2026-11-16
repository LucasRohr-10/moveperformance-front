import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes } from "react";

import { cn } from "@/lib/cn";

const cardVariants = cva("rounded border border-line bg-card", {
  variants: {
    // `md` stays the default so existing cards are unchanged. `sm` is the
    // density `AlertCard` needs; `none` lets a `Table` own the whole surface.
    padding: {
      none: "",
      sm: "p-5",
      md: "p-7",
    },
  },
  defaultVariants: {
    padding: "md",
  },
});

export interface CardProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

export function Card({ className, padding, ...props }: CardProps) {
  return <div className={cn(cardVariants({ padding }), className)} {...props} />;
}
