import { forwardRef, useId, type ReactNode, type SelectHTMLAttributes } from "react";

import { Field, controlClass, describedBy } from "@/components/ui/field";
import { cn } from "@/lib/cn";

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  /** Required: an unlabelled dropdown is the defect this primitive exists to prevent. */
  label: string;
  error?: string;
  /** The `<option>` elements. */
  children: ReactNode;
}

// Native <select> arrows render inconsistently across browsers — some drop
// them entirely once the control gets custom borders/background. Drawing our
// own keeps every dropdown in the app showing the same muted-gray chevron.
// Exported for the rare raw <select> that can't go through this primitive
// (e.g. a compound hour/minute control) but still needs to look like one.
// `bg-[position:…]` needs the explicit type hint: plain `bg-[right_12px_center]`
// reads as ambiguous to tailwind-merge, which then treats it as conflicting
// with — and silently dropping — the control's own `bg-soft`.
export const SELECT_CHEVRON_CLASS =
  "appearance-none bg-no-repeat bg-[length:16px] bg-[position:right_12px_center] pr-10";
export const SELECT_CHEVRON_STYLE = {
  backgroundImage:
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='none' stroke='%239a9a9a' stroke-width='1.6'%3E%3Cpath d='M4 6l4 4 4-4'/%3E%3C/svg%3E\")",
};

// Composes `Field`, so the error paragraph gets an id, `role="alert"` and is
// wired to the control through `aria-describedby`.
export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    { className, style, label, error, id, children, "aria-describedby": ariaDescribedBy, ...props },
    ref,
  ) => {
    const generatedId = useId();
    const selectId = id ?? generatedId;

    return (
      <Field id={selectId} label={label} error={error}>
        <select
          id={selectId}
          ref={ref}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy(selectId, error, ariaDescribedBy)}
          className={controlClass(error, cn(SELECT_CHEVRON_CLASS, className))}
          style={{ ...SELECT_CHEVRON_STYLE, ...style }}
          {...props}
        >
          {children}
        </select>
      </Field>
    );
  },
);

Select.displayName = "Select";
