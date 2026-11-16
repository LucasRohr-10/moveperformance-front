import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes } from "react";

import { cn } from "@/lib/cn";

const headingVariants = cva("font-display font-black uppercase tracking-tight", {
  variants: {
    size: {
      display: "text-6xl leading-[0.95] md:text-7xl",
      lg: "text-4xl",
      md: "text-3xl",
      sm: "text-2xl font-extrabold leading-tight",
    },
  },
  defaultVariants: {
    size: "lg",
  },
});

export interface HeadingProps
  extends HTMLAttributes<HTMLHeadingElement>,
    VariantProps<typeof headingVariants> {
  as?: "h1" | "h2" | "h3" | "h4";
}

export function Heading({ as: Tag = "h2", size, className, ...props }: HeadingProps) {
  return <Tag className={cn(headingVariants({ size }), className)} {...props} />;
}
