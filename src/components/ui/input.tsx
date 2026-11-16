import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";

import { controlClass, describedBy, fieldErrorId } from "@/components/ui/field";
import { cn } from "@/lib/cn";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  /** Shown on the same row as the label, aligned to the right. */
  labelAction?: ReactNode;
  /** Extra classes for the label row — e.g. a shared min-height so inputs in a grid stay aligned even when labels wrap to different line counts. */
  labelRowClassName?: string;
  error?: string;
}

// Keeps its own label/error markup instead of composing `Field`: the optional
// label and `labelAction` row do not fit `Field`, and switching would change the
// DOM of every screen that already renders an `Input`. It shares the control
// class and the `Field`/`Select` error wiring (id + `role="alert"` +
// `aria-describedby`), which is the part that was duplicated — or, for the
// aria wiring, missing entirely.
export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      label,
      labelAction,
      labelRowClassName,
      error,
      id,
      "aria-describedby": ariaDescribedBy,
      ...props
    },
    ref,
  ) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const errorId = fieldErrorId(inputId);

    return (
      <div>
        {label ? (
          <div className={cn("flex items-center justify-between", labelRowClassName)}>
            <label htmlFor={inputId} className="text-xs font-medium text-muted">
              {label}
            </label>
            {labelAction}
          </div>
        ) : null}
        <input
          id={inputId}
          ref={ref}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy(inputId, error, ariaDescribedBy)}
          className={controlClass(error, className)}
          {...props}
        />
        {error ? (
          <p id={errorId} role="alert" className="mt-1.5 text-xs text-danger">
            {error}
          </p>
        ) : null}
      </div>
    );
  },
);

Input.displayName = "Input";
