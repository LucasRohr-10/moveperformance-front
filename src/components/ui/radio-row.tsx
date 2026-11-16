"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

export interface RadioRowProps {
  name: string;
  checked: boolean;
  onSelect: () => void;
  label: ReactNode;
  /** An optional preview line under the label (e.g. a message template's text). */
  description?: ReactNode;
  /** `sm` for a dense grid of short options (e.g. a reason picker); `md` for a taller list with a description. */
  size?: "sm" | "md";
  className?: string;
}

/**
 * One option of a single-select list, drawn as a full clickable row with a radio dot — the
 * denser alternative to `RadioChip` for a vertical list or grid where each option also needs
 * room for a label (and optionally a preview line under it).
 */
export function RadioRow({ name, checked, onSelect, label, description, size = "md", className }: RadioRowProps) {
  const dotSize = size === "sm" ? "size-3" : "size-3.5";
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      name={name}
      onClick={onSelect}
      className={cn(
        "flex min-h-12 w-full items-center gap-3.5 px-3.5 py-3 text-left",
        checked ? "bg-raised" : "bg-soft hover:bg-card",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "box-border shrink-0 rounded-full",
          dotSize,
          checked ? "border-4 border-white" : "border-[1.5px] border-line-strong",
        )}
      />
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className={cn("text-sm", checked ? "font-semibold text-white" : "font-medium text-muted")}>
          {label}
        </span>
        {description ? <span className="truncate text-xs text-muted/70">{description}</span> : null}
      </span>
    </button>
  );
}
