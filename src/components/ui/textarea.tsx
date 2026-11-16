import { forwardRef, useId, type TextareaHTMLAttributes } from "react";

import { controlClass, describedBy, fieldErrorId, FieldError } from "@/components/ui/field";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
}

// The multi-line sibling of `Input`: same label, control class and error wiring.
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, id, "aria-describedby": ariaDescribedBy, ...props }, ref) => {
    const generatedId = useId();
    const textareaId = id ?? generatedId;

    return (
      <div>
        <label htmlFor={textareaId} className="text-xs font-medium text-muted">
          {label}
        </label>
        <textarea
          id={textareaId}
          ref={ref}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy(textareaId, error, ariaDescribedBy)}
          className={controlClass(error, className)}
          {...props}
        />
        {error ? <FieldError id={fieldErrorId(textareaId)}>{error}</FieldError> : null}
      </div>
    );
  },
);

Textarea.displayName = "Textarea";
