import type { HTMLAttributes } from "react";

import { cn } from "@/lib/cn";

export function SectionLabel({
  className,
  ...props
}: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn(
        "text-[11px] font-medium uppercase tracking-[0.35em] text-muted",
        className,
      )}
      {...props}
    />
  );
}
