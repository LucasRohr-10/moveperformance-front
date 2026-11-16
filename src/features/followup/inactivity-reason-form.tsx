"use client";

import { type FormEvent, useEffect, useId, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { RadioChip } from "@/components/ui/radio-chip";
import { useSnackbar } from "@/components/ui/snackbar";
import { businessDateOf } from "@/features/checkout/business-time";
import { ApiError } from "@/lib/api/errors";
import type { InactivityReason } from "@/lib/api/types";

import type { AlertNotice } from "./alert-row";
import { apiErrorMessage, apiFieldErrors } from "./api-error-message";
import { Field, FieldError, controlClass } from "./form-controls";
import { parseNote, parseRecontactOn } from "./followup-fields";
import { REASON_LABELS } from "./followup-labels";
import { startPause } from "./followup-api";

type ReasonField = "reason" | "note" | "recontactOn";
type ReasonErrors = Partial<Record<ReasonField | "form", string>>;

const SAVE_FAILED_MESSAGE = "No pudimos guardar el motivo. Probá de nuevo.";
const REASON_FIELDS: readonly ReasonField[] = ["reason", "note", "recontactOn"];
// The API answers this when the client already has an active pause: what staff sees is out of date.
const PAUSE_ALREADY_ACTIVE = "PAUSE_ALREADY_ACTIVE";
const REASONS = Object.entries<string>(REASON_LABELS) as [InactivityReason, string][];

function errorsOf(error: unknown): ReasonErrors {
  const fromApi = apiFieldErrors(error);
  const errors: ReasonErrors = {};
  for (const field of REASON_FIELDS) if (fromApi[field]) errors[field] = fromApi[field];
  return Object.keys(errors).length > 0 ? errors : { form: apiErrorMessage(error, SAVE_FAILED_MESSAGE) };
}

function isPauseAlreadyActive(error: unknown): boolean {
  return error instanceof ApiError && error.body.code === PAUSE_ALREADY_ACTIVE;
}

/** Registers why a client stopped coming (it pauses them), inline. Shared by the alert card and the client detail. */
export function InactivityReasonForm({
  clientId,
  onDone,
  onCancel,
}: {
  clientId: string;
  // Reports how it ended. A pause that already exists ends it too: the notice outlives the form,
  // because the refresh that follows can remove the card or the form that showed it.
  onDone: (notice: AlertNotice) => void;
  onCancel: () => void;
}) {
  const formId = useId();
  const reasonsRef = useRef<HTMLFieldSetElement>(null);
  // A ref, not state: two clicks in the same tick both see the same render's state.
  const isSavingRef = useRef(false);
  const [reason, setReason] = useState<InactivityReason | null>(null);
  const [note, setNote] = useState("");
  const [recontactOn, setRecontactOn] = useState("");
  const [errors, setErrors] = useState<ReasonErrors>({});
  const { showSnackbar } = useSnackbar();

  // Field errors stay under their field; a failure with no field goes to the snackbar.
  function showSaveErrors(error: unknown): void {
    const { form, ...fieldErrors } = errorsOf(error);
    setErrors(fieldErrors);
    if (form) showSnackbar({ tone: "danger", title: form });
  }
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    reasonsRef.current?.querySelector("input")?.focus();
  }, []);

  function validate(): { ok: true; input: Parameters<typeof startPause>[1] } | { ok: false; errors: ReasonErrors } {
    const parsedNote = parseNote(note);
    const parsedDate = parseRecontactOn(recontactOn, businessDateOf(new Date().toISOString()));
    const found: ReasonErrors = {};
    if (reason === null) found.reason = "Elegí un motivo.";
    if (!parsedNote.ok) found.note = parsedNote.error;
    if (!parsedDate.ok) found.recontactOn = parsedDate.error;
    if (reason === null || !parsedNote.ok || !parsedDate.ok) return { ok: false, errors: found };
    return {
      ok: true,
      input: {
        reason,
        ...(parsedNote.value !== undefined && { note: parsedNote.value }),
        ...(parsedDate.value !== undefined && { recontactOn: parsedDate.value }),
      },
    };
  }

  async function save(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (isSavingRef.current) return;
    const checked = validate();
    if (!checked.ok) {
      setErrors(checked.errors);
      return;
    }

    isSavingRef.current = true;
    setIsSaving(true);
    setErrors({});
    try {
      await startPause(clientId, checked.input);
      onDone({ ok: true, message: "Motivo registrado." });
    } catch (error) {
      if (isPauseAlreadyActive(error)) onDone({ ok: false, message: apiErrorMessage(error, SAVE_FAILED_MESSAGE) });
      else showSaveErrors(error);
    } finally {
      isSavingRef.current = false;
      setIsSaving(false);
    }
  }

  const noteId = `${formId}-note`;
  const dateId = `${formId}-date`;
  return (
    <form onSubmit={(event) => void save(event)} noValidate className="mt-4 border-t border-line pt-4">
      <fieldset>
        <legend className="text-sm font-semibold">Registrar motivo de inactividad</legend>
        <p className="mt-1 text-xs text-muted">
          Registrar un motivo pausa al cliente: no recibe alertas hasta que finalice la pausa.
        </p>
        <fieldset ref={reasonsRef} className="mt-3">
          <legend className="text-xs font-medium text-muted">Motivo</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {REASONS.map(([value, label]) => (
              <RadioChip
                key={value}
                name={`${formId}-reason`}
                value={value}
                checked={reason === value}
                onChange={() => setReason(value)}
                size="sm"
              >
                {label}
              </RadioChip>
            ))}
          </div>
          {errors.reason ? <FieldError id={`${formId}-reason-error`}>{errors.reason}</FieldError> : null}
        </fieldset>
        <Field id={noteId} label="Nota interna (opcional)" error={errors.note} className="mt-4">
          <textarea
            id={noteId}
            rows={3}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            aria-invalid={Boolean(errors.note)}
            aria-describedby={errors.note ? `${noteId}-error` : undefined}
            className={controlClass(errors.note)}
          />
        </Field>
        <Field id={dateId} label="Fecha de re-contacto (opcional)" error={errors.recontactOn} className="mt-4">
          <input
            id={dateId}
            type="date"
            value={recontactOn}
            onChange={(event) => setRecontactOn(event.target.value)}
            aria-invalid={Boolean(errors.recontactOn)}
            aria-describedby={errors.recontactOn ? `${dateId}-error` : undefined}
            className={controlClass(errors.recontactOn)}
          />
        </Field>
      </fieldset>
      <div className="mt-4 flex flex-wrap gap-3">
        <Button type="button" variant="secondary" size="sm" onClick={onCancel} disabled={isSaving} touchTarget>
          Volver
        </Button>
        <Button type="submit" size="sm" disabled={isSaving} touchTarget>
          {isSaving ? "Guardando…" : "Guardar"}
        </Button>
      </div>
    </form>
  );
}
