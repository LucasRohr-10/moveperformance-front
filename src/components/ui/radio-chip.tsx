import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

const SIZE_CLASSES = {
  sm: "px-3 py-1.5 text-xs font-medium",
  md: "px-4 py-2 text-sm",
} as const;

export interface RadioChipProps {
  name: string;
  value: string;
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
  size?: keyof typeof SIZE_CLASSES;
  children: ReactNode;
}

/**
 * A radio input rendered as a chip (sr-only input + a `peer-checked` styled
 * span). Promoted out of `features/checkins/choice-group.tsx` and
 * `features/followup/inactivity-reason-form.tsx`, which had copy-pasted this
 * at two different sizes.
 */
export function RadioChip({ name, value, checked, onChange, disabled, size = "md", children }: RadioChipProps) {
  return (
    <label className="relative inline-flex min-h-11 cursor-pointer sm:min-h-0">
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
        className="peer sr-only"
      />
      <span
        className={cn(
          "inline-flex items-center rounded border border-line text-muted",
          SIZE_CLASSES[size],
          "peer-checked:border-white peer-checked:bg-white peer-checked:text-black",
          "peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-white",
          disabled && "opacity-50",
        )}
      >
        {children}
      </span>
    </label>
  );
}
