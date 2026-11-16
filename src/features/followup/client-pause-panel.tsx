"use client";

import { type FormEvent, useId, useRef, useState } from "react";

import { buttonVariants } from "@/components/ui/button";
import { controlClass } from "@/components/ui/field";
import { RadioRow } from "@/components/ui/radio-row";
import { useSnackbar } from "@/components/ui/snackbar";
import { businessDateOf } from "@/features/checkout/business-time";
import { formatBusinessDate } from "@/features/subscriptions/present-subscriptions";
import { ApiError } from "@/lib/api/errors";
import type { InactivityReason } from "@/lib/api/types";
import { cn } from "@/lib/cn";

import type { AlertNotice } from "./alert-row";
import { apiErrorMessage, apiFieldErrors } from "./api-error-message";
import { parseNote, parseRecontactOn } from "./followup-fields";
import { REASON_LABELS } from "./followup-labels";
import { startPause } from "./followup-api";

type PauseField = "note" | "recontactOn";
type PauseErrors = Partial<Record<PauseField | "form", string>>;

const SAVE_FAILED_MESSAGE = "No pudimos guardar el motivo. Probá de nuevo.";
// The API answers this when the client already has an active pause: what staff sees is out of date.
const PAUSE_ALREADY_ACTIVE = "PAUSE_ALREADY_ACTIVE";
const PAUSE_FIELDS: readonly PauseField[] = ["note", "recontactOn"];
const REASONS = Object.entries(REASON_LABELS) as [InactivityReason, string][];

const PRESETS: readonly { label: string; days: number }[] = [
  { label: "2 semanas", days: 14 },
  { label: "1 mes", days: 30 },
  { label: "2 meses", days: 60 },
  { label: "3 meses", days: 90 },
];

// Date.UTC keeps the day count independent of any time zone or daylight saving.
function addDays(date: string, days: number): string {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

function errorsOf(error: unknown): PauseErrors {
  const fromApi = apiFieldErrors(error);
  const errors: PauseErrors = {};
  for (const field of PAUSE_FIELDS) if (fromApi[field]) errors[field] = fromApi[field];
  return Object.keys(errors).length > 0 ? errors : { form: apiErrorMessage(error, SAVE_FAILED_MESSAGE) };
}

function isPauseAlreadyActive(error: unknown): boolean {
  return error instanceof ApiError && error.body.code === PAUSE_ALREADY_ACTIVE;
}

/** The "Pausar" tab of the client's follow-up card: why the client isn't coming, and when to pick it back up. */
export function ClientPausePanel({
  clientId,
  onDone,
}: {
  clientId: string;
  onDone: (notice: AlertNotice) => void;
}) {
  const formId = useId();
  const isSavingRef = useRef(false);
  const [reason, setReason] = useState<InactivityReason | null>(null);
  const [recontactOn, setRecontactOn] = useState("");
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<PauseErrors>({});
  const [isSaving, setIsSaving] = useState(false);
  const { showSnackbar } = useSnackbar();
  const today = businessDateOf(new Date().toISOString());

  function showSaveErrors(error: unknown): void {
    const { form, ...fieldErrors } = errorsOf(error);
    setErrors(fieldErrors);
    if (form) showSnackbar({ tone: "danger", title: form });
  }

  async function save(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (isSavingRef.current || !reason) return;
    const parsedNote = parseNote(note);
    const parsedDate = parseRecontactOn(recontactOn, today);
    if (!parsedNote.ok || !parsedDate.ok) {
      setErrors({
        ...(!parsedNote.ok && { note: parsedNote.error }),
        ...(!parsedDate.ok && { recontactOn: parsedDate.error }),
      });
      return;
    }

    isSavingRef.current = true;
    setIsSaving(true);
    setErrors({});
    try {
      await startPause(clientId, {
        reason,
        ...(parsedNote.value !== undefined && { note: parsedNote.value }),
        ...(parsedDate.value !== undefined && { recontactOn: parsedDate.value }),
      });
      onDone({ ok: true, message: "Motivo registrado." });
    } catch (error) {
      if (isPauseAlreadyActive(error)) onDone({ ok: false, message: apiErrorMessage(error, SAVE_FAILED_MESSAGE) });
      else showSaveErrors(error);
    } finally {
      isSavingRef.current = false;
      setIsSaving(false);
    }
  }

  const dateId = `${formId}-date`;
  const noteId = `${formId}-note`;
  const dateHint = recontactOn
    ? `Te avisamos el ${formatBusinessDate(recontactOn)} para retomar el contacto.`
    : "Sin fecha, la pausa queda hasta que la reanudes.";

  return (
    <form
      onSubmit={(event) => void save(event)}
      noValidate
      className="flex flex-col gap-[22px] px-4 pt-5 pb-6 sm:px-7 sm:pt-6 sm:pb-7"
    >
      <p className="text-sm leading-relaxed text-muted">
        Si el cliente avisó que no va a venir por un tiempo, pausá el seguimiento: no vas a recibir alertas de
        inactividad sobre él hasta la fecha que elijas.
      </p>

      <fieldset>
        <legend className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">¿Por qué no viene?</legend>
        <div
          role="radiogroup"
          aria-label="Motivo"
          className="mt-2.5 grid grid-cols-2 gap-px overflow-hidden rounded border border-line bg-line"
        >
          {REASONS.map(([value, label]) => (
            <RadioRow
              key={value}
              name={`${formId}-reason`}
              size="sm"
              className="min-h-12"
              checked={reason === value}
              onSelect={() => setReason(value)}
              label={label}
            />
          ))}
        </div>
      </fieldset>

      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">Volver a contactar</p>
        <div className="mt-2.5 grid grid-cols-2 gap-1.5 sm:flex sm:flex-wrap">
          {PRESETS.map((preset) => {
            const value = addDays(today, preset.days);
            const active = recontactOn === value;
            return (
              <button
                key={preset.label}
                type="button"
                onClick={() => setRecontactOn(value)}
                className={cn(
                  "rounded border px-3 py-2.5 text-xs font-medium sm:py-1.5",
                  active ? "border-white bg-white text-black" : "border-line text-muted hover:text-white",
                )}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
        <label htmlFor={dateId} className="sr-only">
          Fecha de re-contacto (opcional)
        </label>
        <input
          id={dateId}
          type="date"
          value={recontactOn}
          onChange={(event) => setRecontactOn(event.target.value)}
          aria-invalid={Boolean(errors.recontactOn)}
          aria-describedby={errors.recontactOn ? `${dateId}-error` : undefined}
          className={controlClass(errors.recontactOn, "mt-2.5 h-12 text-base sm:h-auto sm:text-sm")}
        />
        {errors.recontactOn ? (
          <p id={`${dateId}-error`} role="alert" className="mt-1.5 text-xs text-danger">
            {errors.recontactOn}
          </p>
        ) : (
          <p className="mt-2 text-xs text-muted">{dateHint}</p>
        )}
      </div>

      <div>
        <label htmlFor={noteId} className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">
          Nota interna · opcional
        </label>
        <textarea
          id={noteId}
          rows={3}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Ej.: esguince de tobillo, vuelve con alta médica"
          aria-invalid={Boolean(errors.note)}
          aria-describedby={errors.note ? `${noteId}-error` : undefined}
          className={controlClass(errors.note, "mt-2.5 text-base sm:text-sm")}
        />
        {errors.note ? (
          <p id={`${noteId}-error`} role="alert" className="mt-1.5 text-xs text-danger">
            {errors.note}
          </p>
        ) : null}
      </div>

      <button
        type="submit"
        disabled={isSaving || !reason}
        className={cn(
          buttonVariants({ variant: reason ? "primary" : "secondary" }),
          "h-[52px] w-full px-4 text-[11px] sm:h-auto sm:py-3.5",
        )}
      >
        {isSaving ? "Guardando…" : "Pausar seguimiento"}
      </button>
    </form>
  );
}
