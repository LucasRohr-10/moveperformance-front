import type { HTMLAttributes } from "react";

import { cn } from "@/lib/cn";

export function Tag({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "rounded border-2 border-white/15 bg-white/10 px-2 py-1 text-xs text-neutral-300",
        className,
      )}
      {...props}
    />
  );
}
