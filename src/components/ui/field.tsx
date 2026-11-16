import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

/**
 * The look of a text-entry control (input, select, textarea). Promoted from
 * `features/followup/form-controls.tsx` so every control shares one string.
 *
 * `placeholder:text-muted/80` (not `/60`): over `bg-soft` the 60% blend is
 * ≈#616161 ≈ 3.2:1, below the WCAG AA 4.5:1 minimum for text. 80% blends to
 * ≈#7e7e7e ≈ 4.8:1.
 *
 * The `disabled:` pair matches `buttonVariants` and is the fuller of the two
 * disabled treatments already copied around the codebase, so the remaining
 * copies (`plans/staff/plan-form.tsx`, `checkins/checkin-form.tsx`) can adopt
 * this string as-is instead of forking it again.
 */
export const CONTROL_CLASS =
  "mt-2 w-full rounded border border-line bg-soft px-3.5 py-2.5 text-sm text-white placeholder:text-muted/80 focus:border-white focus:outline-none disabled:cursor-not-allowed disabled:opacity-50";

// A soft red halo and one short shake, so the field to fix stands out on submit.
const ERROR_CONTROL_CLASS = "border-danger ring-3 ring-danger/20 motion-safe:animate-field-shake";

/** The control class, reddened when the field is in error. */
export function controlClass(error?: string, className?: string): string {
  return cn(CONTROL_CLASS, error && ERROR_CONTROL_CLASS, className);
}

/** Id of the error paragraph `Field` renders, for the control's `aria-describedby`. */
export function fieldErrorId(fieldId: string): string {
  return `${fieldId}-error`;
}

/**
 * Ids for a control's `aria-describedby`: whatever the caller already
 * described it with, plus the field's own error id when there is one.
 * Composed, not overwritten: a caller passing its own hint must not silence
 * the error message, and an error must not silence the caller's hint.
 */
export function describedBy(fieldId: string, error?: string, caller?: string): string | undefined {
  const ids = [caller, error ? fieldErrorId(fieldId) : undefined].filter(Boolean);
  return ids.length > 0 ? ids.join(" ") : undefined;
}

export function FieldError({ id, children }: { id: string; children: ReactNode }) {
  return (
    <p id={id} role="alert" className="mt-1.5 text-xs text-danger">
      {children}
    </p>
  );
}

export interface FieldProps {
  /** Also the control's `id`; the error paragraph is `fieldErrorId(id)`. */
  id: string;
  label: string;
  error?: string;
  children: ReactNode;
  className?: string;
}

// A label, its control and the error under it; the control gets `id` and
// `aria-describedby` from the caller, so this works with any control element.
export function Field({ id, label, error, children, className }: FieldProps) {
  return (
    <div className={className}>
      <label htmlFor={id} className="text-xs font-medium text-muted">
        {label}
      </label>
      {children}
      {error ? <FieldError id={fieldErrorId(id)}>{error}</FieldError> : null}
    </div>
  );
}
