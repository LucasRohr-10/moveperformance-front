import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

export interface EmptyStateProps {
  title: string;
  description?: string;
  /** Usually a `Button` that clears the filter or creates the first record. */
  action?: ReactNode;
  /**
   * `alert` when the state is a failure: a load error has to be announced, not
   * just drawn. An empty list is not an alert — it is the normal answer.
   */
  role?: "alert" | "status";
  className?: string;
}

/**
 * What a list renders instead of a bare `<thead>` when there is nothing to show.
 * Sits inside the table's surface, so it carries the same `px-5` as a table cell.
 */
export function EmptyState({
  title,
  description,
  action,
  role,
  className,
}: EmptyStateProps) {
  return (
    <div role={role} className={cn("px-5 py-12 text-center", className)}>
      <p className="text-sm font-semibold text-white">{title}</p>
      {description ? <p className="mt-2 text-sm text-muted">{description}</p> : null}
      {action ? <div className="mt-6 flex justify-center">{action}</div> : null}
    </div>
  );
}
