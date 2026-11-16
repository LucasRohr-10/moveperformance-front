import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

/**
 * The container every top-level route shares: public, auth and authenticated
 * pages alike. It used to be ~27 copies of the same `div`, each with its own
 * vertical padding — pass `className` to override just that part.
 */
export function PageContainer({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("mx-auto max-w-[1160px] px-6 py-16", className)}>{children}</div>;
}
