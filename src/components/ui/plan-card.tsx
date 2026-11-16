import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

export interface PlanCardProps {
  name: string;
  price: string;
  features: string[];
  highlighted?: boolean;
  badge?: string;
  action: ReactNode;
  className?: string;
}

export function PlanCard({
  name,
  price,
  features,
  highlighted,
  badge,
  action,
  className,
}: PlanCardProps) {
  return (
    <div
      className={cn(
        "relative flex flex-col rounded border bg-card p-7",
        highlighted ? "border-white" : "border-line",
        className,
      )}
    >
      {badge ? (
        <span className="absolute -top-3 left-6 rounded bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-black">
          {badge}
        </span>
      ) : null}
      <p className="text-[11px] uppercase tracking-[0.3em] text-muted">{name}</p>
      <p className="mt-3 font-display text-4xl font-black">
        {price}
      </p>
      <ul className="mt-6 flex-1 space-y-3 text-sm text-muted">
        {features.map((feature) => (
          <li key={feature} className="flex gap-2.5">
            <span className="text-white">&#10003;</span>
            {feature}
          </li>
        ))}
      </ul>
      <div className="mt-7">{action}</div>
    </div>
  );
}
