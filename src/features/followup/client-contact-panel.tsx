"use client";

import { useId, useRef, useState } from "react";

import { buttonVariants } from "@/components/ui/button";
import { RadioRow } from "@/components/ui/radio-row";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { useSnackbar } from "@/components/ui/snackbar";
import type { ContactChannel, ContactTemplate } from "@/lib/api/types";
import { cn } from "@/lib/cn";

import type { AlertNotice } from "./alert-row";
import { apiErrorMessage } from "./api-error-message";
import { recordContact } from "./followup-api";
import { whatsappLink } from "./whatsapp-link";

const SEND_FAILED_MESSAGE = "No pudimos registrar el envío. Probá de nuevo.";

const CHANNELS: readonly { value: ContactChannel; label: string }[] = [
  { value: "whatsapp", label: "WhatsApp" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Teléfono" },
  { value: "in_person", label: "En persona" },
];

// Generic nudges, not tied to a specific booking or plan we can't confirm from here.
const TEMPLATES: Record<ContactTemplate, { label: string; text: (name: string) => string }> = {
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
const TEMPLATE_ORDER: readonly ContactTemplate[] = ["reminder", "payment", "miss_you", "free"];

// Only whatsapp and email have something to compose; phone and in_person don't.
const HAS_MESSAGE: Record<ContactChannel, boolean> = {
  whatsapp: true,
  email: true,
  phone: false,
  in_person: false,
};

const SEND_LABEL: Record<ContactChannel, string> = {
  whatsapp: "Abrir en WhatsApp",
  email: "Abrir en email",
  phone: "Registrar llamada",
  in_person: "Registrar contacto",
};

/** The "Contactar" tab of the client's follow-up card: channel, template and message, then send. */
export function ClientContactPanel({
  clientId,
  clientName,
  clientPhone,
  clientEmail,
  onSent,
}: {
  clientId: string;
  clientName: string;
  clientPhone?: string | null;
  clientEmail?: string | null;
  onSent: (notice: AlertNotice) => void;
}) {
  const messageId = useId();
  const isSendingRef = useRef(false);
  const [channel, setChannel] = useState<ContactChannel>("whatsapp");
  const [template, setTemplate] = useState<ContactTemplate>("reminder");
  const [message, setMessage] = useState(TEMPLATES.reminder.text(clientName));
  const [touched, setTouched] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const { showSnackbar } = useSnackbar();

  function pickTemplate(key: ContactTemplate): void {
    setTemplate(key);
    setMessage(TEMPLATES[key].text(clientName));
    setTouched(false);
  }

  const needsMessage = HAS_MESSAGE[channel];
  const recipient = (channel === "email" ? clientEmail : clientPhone) ?? "—";

  async function send(): Promise<void> {
    if (isSendingRef.current) return;
    isSendingRef.current = true;
    setIsSending(true);
    try {
      await recordContact(clientId, {
        channel,
        ...(channel === "email" && message.trim() && { note: message.trim(), template }),
      });
      onSent({ ok: true, message: "Contacto registrado. Vas a poder cargar el resultado desde la lista." });
    } catch (error) {
      showSnackbar({ tone: "danger", title: apiErrorMessage(error, SEND_FAILED_MESSAGE) });
    } finally {
      isSendingRef.current = false;
      setIsSending(false);
    }
  }

  // Whatsapp/phone open the app directly when the number is known; otherwise it's just registered.
  const sendHref =
    channel === "whatsapp" && clientPhone
      ? whatsappLink(clientPhone, message)
      : channel === "phone" && clientPhone
        ? `tel:${clientPhone}`
        : undefined;
  const isEmailDisabled = channel === "email" && !message.trim();
  // "Abrir en WhatsApp" would be a false promise without a phone to open: it just gets registered instead.
  const sendLabel = isSending
    ? "Enviando…"
    : !sendHref && channel === "whatsapp"
      ? "Registrar envío"
      : SEND_LABEL[channel];

  return (
    <div className="flex flex-col gap-[22px] px-4 pt-5 pb-6 sm:px-7 sm:pt-6 sm:pb-7">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">Canal</p>
        <SegmentedControl
          className="mt-2.5"
          aria-label="Canal"
          options={CHANNELS}
          value={channel}
          onChange={setChannel}
        />
      </div>

      {needsMessage ? (
        <>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">Plantilla</p>
            <div role="radiogroup" aria-label="Plantilla" className="mt-2.5 flex flex-col divide-y divide-line overflow-hidden rounded border border-line">
              {TEMPLATE_ORDER.map((key) => (
                <RadioRow
                  key={key}
                  name="contact-template"
                  className="min-h-14"
                  checked={template === key && !touched}
                  onSelect={() => pickTemplate(key)}
                  label={TEMPLATES[key].label}
                  description={TEMPLATES[key].text(clientName) || "Escribís el mensaje desde cero."}
                />
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-baseline justify-between gap-3">
              <label htmlFor={messageId} className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">
                Mensaje
              </label>
              <span className="text-xs text-muted">{`Para ${recipient}`}</span>
            </div>
            <textarea
              id={messageId}
              rows={4}
              value={message}
              placeholder="Escribí el mensaje…"
              onChange={(event) => {
                setMessage(event.target.value);
                setTouched(true);
              }}
              className="mt-2.5 w-full resize-y rounded border border-line bg-soft px-3.5 py-3 text-base leading-relaxed text-white outline-none focus:border-white sm:text-sm"
            />
          </div>
        </>
      ) : (
        <p className="text-sm text-muted">
          {channel === "phone"
            ? `Llamá al ${clientPhone ?? "teléfono del cliente"} y registrá el contacto cuando cortes.`
            : "Registrá la conversación que tuviste en la sala."}
        </p>
      )}

      <div className="flex flex-col gap-3 border-t border-line pt-5">
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
              buttonVariants({ variant: "primary" }),
              "h-[52px] w-full gap-2.5 px-4 text-[11px] sm:h-auto sm:py-3.5",
              isSending && "pointer-events-none opacity-50",
            )}
          >
            {sendLabel}
            <span aria-hidden="true">↗</span>
          </a>
        ) : (
          <button
            type="button"
            onClick={() => void send()}
            disabled={isSending || isEmailDisabled}
            className={cn(
              buttonVariants({ variant: "primary" }),
              "h-[52px] w-full gap-2.5 px-4 text-[11px] sm:h-auto sm:py-3.5",
            )}
          >
            {sendLabel}
            {channel === "email" ? <span aria-hidden="true">↗</span> : null}
          </button>
        )}
        <p className="text-center text-xs leading-relaxed text-muted">
          El contacto queda registrado abajo. Después podés cargar el resultado.
        </p>
      </div>
    </div>
  );
}
