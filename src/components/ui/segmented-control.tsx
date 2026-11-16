"use client";

import { cn } from "@/lib/cn";

export interface SegmentedControlOption<T extends string> {
  value: T;
  label: string;
}

export interface SegmentedControlProps<T extends string> {
  options: readonly SegmentedControlOption<T>[];
  value: T;
  onChange: (value: T) => void;
  "aria-label"?: string;
  className?: string;
}

/** A row of equal-width buttons acting as a single-select control, for a handful of mutually exclusive options (e.g. a contact channel). */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  className,
  ...aria
}: SegmentedControlProps<T>) {
  return (
    <div
      role="radiogroup"
      className={cn("grid overflow-hidden rounded border border-line", className)}
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
      {...aria}
    >
      {options.map((option, index) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={option.value === value}
          onClick={() => onChange(option.value)}
          className={cn(
            "px-1 py-[14px] text-xs font-medium sm:py-[11px]",
            index > 0 && "border-l border-line",
            option.value === value ? "bg-white text-black" : "bg-soft text-muted hover:text-white",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
