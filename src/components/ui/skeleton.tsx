import type { HTMLAttributes } from "react";

import { cn } from "@/lib/cn";

/**
 * One pulsing block. Size it with `className` (`h-4 w-32`, `size-10`,
 * `rounded-full`) to build a placeholder shaped like the content it replaces —
 * a row of these inside a `Table` surface is the table skeleton.
 *
 * `bg-card` is the existing convention (`features/auth/avatar-slot.tsx`), which
 * assumes a `bg-bg` / `bg-soft` background; on a card surface pass `bg-line`.
 *
 * Decorative, so it is hidden from assistive technology: the container should
 * announce the load (`role="status"` with text, as `followup` does).
 */
export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden="true"
      className={cn("animate-pulse rounded bg-card", className)}
      {...props}
    />
  );
}
