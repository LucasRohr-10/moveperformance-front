"use client";

import { useCallback } from "react";
import { z } from "zod";

import { useSnackbar } from "./snackbar";

const CONTROLS = "input, select, textarea";

export const INVALID_FIELDS_MESSAGE = "Los marcamos en rojo.";

export function invalidFieldsTitle(count: number): string {
  return count === 1 ? "Revisá 1 campo" : `Revisá ${count} campos`;
}

/**
 * Call on a submit with validation errors: says how many fields to fix and,
 * once React has painted the `aria-invalid` marks, takes the focus to the first one.
 */
export function useInvalidFieldsFeedback(): (
  form: HTMLFormElement | null,
  errors: Record<string, string | undefined>,
) => void {
  const { showSnackbar } = useSnackbar();

  return useCallback(
    (form, errors) => {
      const count = Object.values(errors).filter(Boolean).length;
      if (count === 0) return;
      showSnackbar({ tone: "danger", title: invalidFieldsTitle(count), message: INVALID_FIELDS_MESSAGE });
      requestAnimationFrame(() => {
        const invalid = form?.querySelector<HTMLElement>('[aria-invalid="true"]');
        // A group (e.g. radios) is marked as a whole; its first control takes the focus.
        const first = invalid?.matches(CONTROLS) ? invalid : (invalid?.querySelector<HTMLElement>(CONTROLS) ?? invalid);
        first?.focus({ preventScroll: true });
        // Optional call: jsdom has no scrollIntoView, every browser does.
        first?.scrollIntoView?.({ block: "center" });
      });
    },
    [showSnackbar],
  );
}

/** Re-runs the submit's validation and keeps only one field's error, to clear it as soon as it is fixed. */
export function fieldErrorFor(schema: z.ZodType, values: unknown, field: string): string | undefined {
  const parsed = schema.safeParse(values);
  if (parsed.success) return undefined;
  const errors: Record<string, string[] | undefined> = z.flattenError(parsed.error).fieldErrors;
  return errors[field]?.[0];
}

/** The `name` of the control that fired a form's change event. */
export function changedFieldName(event: { target: EventTarget }): string {
  return (event.target as Partial<HTMLInputElement>).name ?? "";
}
