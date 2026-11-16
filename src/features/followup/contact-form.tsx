"use client";

import { type FormEvent, useEffect, useId, useRef, useState } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { useSnackbar } from "@/components/ui/snackbar";
import type { ContactChannel, ContactOutcome, ContactTemplate } from "@/lib/api/types";
import { cn } from "@/lib/cn";

import type { AlertNotice } from "./alert-row";
import { apiErrorMessage, apiFieldErrors } from "./api-error-message";
import { Field, controlClass } from "./form-controls";
import { parseNote } from "./followup-fields";
import { CHANNEL_LABELS, OUTCOME_LABELS } from "./followup-labels";
import { completeContact, recordContact } from "./followup-api";
import { whatsappLink } from "./whatsapp-link";

type ContactField = "outcome" | "note";
type ContactErrors = Partial<Record<ContactField | "form", string>>;

const SAVE_FAILED_MESSAGE = "No pudimos guardar el resultado. Probá de nuevo.";
const SEND_FAILED_MESSAGE = "No pudimos registrar el envío. Probá de nuevo.";
const CONTACT_FIELDS: readonly ContactField[] = ["outcome", "note"];

function errorsOf(error: unknown): ContactErrors {
  const fromApi = apiFieldErrors(error);
  const errors: ContactErrors = {};
  for (const field of CONTACT_FIELDS) if (fromApi[field]) errors[field] = fromApi[field];
  return Object.keys(errors).length > 0 ? errors : { form: apiErrorMessage(error, SAVE_FAILED_MESSAGE) };
}

function optionsOf<T extends string>(labels: Record<T, string>): [T, string][] {
  return Object.entries<string>(labels) as [T, string][];
}

type TemplateKey = ContactTemplate;

// Generic nudges, not tied to a specific booking or plan we can't confirm from here.
const TEMPLATES: Record<TemplateKey, { label: string; text: (name: string) => string }> = {
  reminder: {
    label: "Recordatorio de turno",
    text: (name) => `Hola ${name}, te escribimos para recordarte tu próximo turno en MOVE.`,
  },
  payment: {
    label: "Pago pendiente",
    text: (name) =>
      `Hola ${name}, tenés un pago pendiente de tu plan. Escribinos si necesitás ayuda para regularizarlo.`,
  },
  miss_you: {
    label: "Te extrañamos",
    text: (name) => `Hola ${name}, hace un tiempo que no te vemos por MOVE. ¿Coordinamos un turno?`,
  },
  free: { label: "Mensaje libre", text: () => "" },
};

const TEMPLATE_ORDER: readonly TemplateKey[] = ["reminder", "payment", "miss_you", "free"];

// Only whatsapp and email have something to compose; phone and in_person don't.
const HAS_MESSAGE: Record<ContactChannel, boolean> = {
  whatsapp: true,
  email: true,
  phone: false,
  in_person: false,
};

const SEND_LABEL: Record<ContactChannel, string> = {
  whatsapp: "Abrir en WhatsApp",
  email: "Enviar email",
  phone: "Llamar",
  in_person: "Continuar",
};

/**
 * Two unrelated moments, never the same form instance: sending a contact now
 * (channel + an optional composed message) closes as soon as it's registered —
 * the outcome isn't known yet, so it's never asked for here. Logging how a
 * contact went is a separate, later action (`completing`), opened from the
 * contacts list once the pending entry shows up there.
 */
export function ContactForm({
  clientId,
  clientName,
  clientPhone,
  alertId,
  completing,
  onDone,
  onCancel,
}: {
  clientId: string;
  clientName: string;
  /** Only known from the client's own page — an alert card doesn't carry contact info. */
  clientPhone?: string | null;
  alertId?: string;
  /** Skip phase 1: log the outcome of a contact that was already sent (e.g. from the contacts list). */
  completing?: { contactId: string; channel: ContactChannel };
  onDone: (notice: AlertNotice) => void;
  onCancel: () => void;
}) {
  const formId = useId();
  const channelRef = useRef<HTMLSelectElement>(null);
  const outcomeRef = useRef<HTMLSelectElement>(null);
  // Refs, not state: two clicks in the same tick both see the same render's state.
  const isSendingRef = useRef(false);
  const isSavingRef = useRef(false);

  const [channel, setChannel] = useState<ContactChannel>(completing?.channel ?? "whatsapp");
  const [template, setTemplate] = useState<TemplateKey>("reminder");
  const [message, setMessage] = useState(TEMPLATES.reminder.text(clientName));
  const [isSending, setIsSending] = useState(false);
  const { showSnackbar } = useSnackbar();

  const [outcome, setOutcome] = useState<ContactOutcome>("reached");
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<ContactErrors>({});

  // Field errors stay under their field; a failure with no field goes to the snackbar.
  function showSaveErrors(error: unknown): void {
    const { form, ...fieldErrors } = errorsOf(error);
    setErrors(fieldErrors);
    if (form) showSnackbar({ tone: "danger", title: form });
  }
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (completing) outcomeRef.current?.focus();
    else channelRef.current?.focus();
  }, [completing]);

  function selectTemplate(key: TemplateKey): void {
    setTemplate(key);
    setMessage(TEMPLATES[key].text(clientName));
  }

  async function send(): Promise<void> {
    if (isSendingRef.current) return;
    isSendingRef.current = true;
    setIsSending(true);
    try {
      await recordContact(clientId, {
        channel,
        ...(alertId !== undefined && { alertId }),
        ...(channel === "email" && message.trim() && { note: message.trim(), template }),
      });
      onDone({ ok: true, message: "Contacto registrado. Vas a poder cargar el resultado desde la lista." });
    } catch (error) {
      showSnackbar({ tone: "danger", title: apiErrorMessage(error, SEND_FAILED_MESSAGE) });
    } finally {
      isSendingRef.current = false;
      setIsSending(false);
    }
  }

  async function saveOutcome(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (isSavingRef.current || !completing) return;
    const parsedNote = parseNote(note);
    if (!parsedNote.ok) {
      setErrors({ note: parsedNote.error });
      return;
    }

    isSavingRef.current = true;
    setIsSaving(true);
    setErrors({});
    try {
      await completeContact(clientId, completing.contactId, {
        outcome,
        ...(parsedNote.value !== undefined && { note: parsedNote.value }),
      });
      onDone({ ok: true, message: "Resultado guardado." });
    } catch (error) {
      showSaveErrors(error);
    } finally {
      isSavingRef.current = false;
      setIsSaving(false);
    }
  }

  const noteId = `${formId}-note`;

  if (completing) {
    return (
      <form onSubmit={(event) => void saveOutcome(event)} noValidate className="mt-4 border-t border-line pt-4">
        <fieldset>
          <legend className="text-sm font-semibold">{`¿Cómo fue el contacto con ${clientName}?`}</legend>
          <p className="mt-1 text-xs text-muted">
            {`Ya quedó registrado el envío por ${CHANNEL_LABELS[channel].toLowerCase()}.`}
          </p>
          <div className="mt-3 max-w-xs">
            <Select
              id={`${formId}-outcome`}
              ref={outcomeRef}
              label="Resultado"
              error={errors.outcome}
              value={outcome}
              onChange={(event) => setOutcome(event.target.value as ContactOutcome)}
            >
              {optionsOf(OUTCOME_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </div>
          <Field id={noteId} label="Nota (opcional)" error={errors.note} className="mt-4">
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
        </fieldset>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button type="button" variant="secondary" size="sm" onClick={onCancel} disabled={isSaving} touchTarget>
            Volver
          </Button>
          <Button type="submit" size="sm" disabled={isSaving} touchTarget>
            {isSaving ? "Guardando…" : "Guardar resultado"}
          </Button>
        </div>
      </form>
    );
  }

  const sendHref =
    channel === "whatsapp" && clientPhone
      ? whatsappLink(clientPhone, message)
      : channel === "phone" && clientPhone
        ? `tel:${clientPhone}`
        : undefined;
  // Email goes straight through the backend (real send via Brevo), never a link.
  const isEmailDisabled = channel === "email" && !message.trim();
  const sendLabel = isSending
    ? channel === "email"
      ? "Enviando…"
      : "Registrando…"
    : sendHref
      ? SEND_LABEL[channel]
      : channel === "email"
        ? SEND_LABEL.email
        : "Registrar envío";

  return (
    <div className="mt-4 border-t border-line pt-4">
      <fieldset>
        <legend className="text-sm font-semibold">{`Contactar a ${clientName}`}</legend>
        <p className="mt-1 text-xs text-muted">Elegí el canal. El resultado se carga después de enviarlo.</p>
        <div className="mt-3 max-w-xs">
          <Select
            id={`${formId}-channel`}
            ref={channelRef}
            label="Canal"
            value={channel}
            onChange={(event) => setChannel(event.target.value as ContactChannel)}
          >
            {optionsOf(CHANNEL_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>
        {HAS_MESSAGE[channel] ? (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Select
              id={`${formId}-template`}
              label="Plantilla"
              value={template}
              onChange={(event) => selectTemplate(event.target.value as TemplateKey)}
            >
              {TEMPLATE_ORDER.map((key) => (
                <option key={key} value={key}>
                  {TEMPLATES[key].label}
                </option>
              ))}
            </Select>
            <Field id={`${formId}-message`} label="Mensaje" className="sm:col-span-2">
              <textarea
                id={`${formId}-message`}
                rows={4}
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                className={controlClass()}
              />
            </Field>
          </div>
        ) : null}
      </fieldset>
      <div className="mt-4 flex flex-wrap gap-3">
        <Button type="button" variant="secondary" size="sm" onClick={onCancel} disabled={isSending} touchTarget>
          Volver
        </Button>
        {sendHref ? (
          <a
            href={sendHref}
            target={channel === "phone" ? undefined : "_blank"}
            rel={channel === "phone" ? undefined : "noreferrer"}
            aria-disabled={isSending}
            onClick={(event) => {
              if (isSendingRef.current) event.preventDefault();
              else void send();
            }}
            className={cn(
              buttonVariants({ size: "sm", touchTarget: true }),
              isSending && "pointer-events-none opacity-50",
            )}
          >
            {sendLabel}
          </a>
        ) : (
          <Button
            type="button"
            size="sm"
            onClick={() => void send()}
            disabled={isSending || isEmailDisabled}
            touchTarget
          >
            {sendLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
