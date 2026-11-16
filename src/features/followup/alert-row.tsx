"use client";

import Link from "next/link";
import { type FocusEvent, type KeyboardEvent, type MouseEvent, useEffect, useId, useRef, useState } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { ROUTES } from "@/config/constants/routes.constants";
import type { AlertDto } from "@/lib/api/types";
import { cn } from "@/lib/cn";

import { apiErrorMessage } from "./api-error-message";
import { ContactForm } from "./contact-form";
import { recordContact } from "./followup-api";
import { InactivityReasonForm } from "./inactivity-reason-form";
import { type AlertAction, type AlertHeadline, presentAlert } from "./present-alert";
import { CheckIcon, MoreIcon, WhatsAppIcon } from "./row-icons";
import { type ActionResult, isStaleAlertError } from "./use-followup-alerts";
import { whatsappLink } from "./whatsapp-link";

export interface AlertNotice {
  ok: boolean;
  message: string;
}

// Shared by the rows and the column header of the panel so both line up.
// The five columns need a wide screen (the sidebar takes 240px); below it each row stacks like on a phone.
export const ALERT_ROW_GRID =
  "xl:grid xl:grid-cols-[minmax(0,1.8fr)_11.5rem_minmax(0,2fr)_5.5rem_15rem] xl:items-center xl:gap-4";

type FormAction = Extract<AlertAction, "contact" | "reason">;

const HANDLED_MESSAGE = "Alerta marcada como gestionada.";
const CONTACT_REGISTERED_MESSAGE = "Contacto registrado. Vas a poder cargar el resultado desde la lista.";
const CONTACT_FAILED_MESSAGE =
  'Se abrió WhatsApp, pero no pudimos registrar el contacto. Registralo desde "Otro canal de contacto".';

const MENU_ITEM_CLASS = "flex min-h-11 w-full items-center rounded px-3 py-2.5 text-left text-xs hover:bg-card md:min-h-0";

function Headline({ headline }: { headline: AlertHeadline }) {
  const title =
    headline.kind === "quote" ? (
      <p className="text-sm italic">{headline.text}</p>
    ) : (
      <p className="text-sm font-medium">{headline.title}</p>
    );
  return (
    <div className="min-w-0">
      {title}
      {headline.detail ? <p className="mt-0.5 text-xs text-muted">{headline.detail}</p> : null}
    </div>
  );
}

/**
 * One alert as a table row with its actions. It only draws what `presentAlert` decides and reports what happened:
 * the notice is shown by the panel, because a handled alert leaves the list and takes the row with it.
 */
export function AlertRow({
  alert,
  today,
  onHandle,
  onChanged,
  onRefresh,
}: {
  alert: AlertDto;
  today: string;
  onHandle: (id: string) => Promise<ActionResult>;
  onChanged: (notice: AlertNotice) => void;
  // What the row shows is out of date (a contact was added, a pause started): load the list again.
  onRefresh: () => void;
}) {
  const model = presentAlert(alert, today);
  const { name, phone } = { name: alert.client.name, phone: alert.client.phone };
  const menuId = useId();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [openAction, setOpenAction] = useState<FormAction | null>(null);
  const [isConfirmingHandle, setIsConfirmingHandle] = useState(false);
  const [isHandling, setIsHandling] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  // Refs, not state: two clicks in the same tick both see the same render's state.
  const isHandlingRef = useRef(false);
  const isRegisteringRef = useRef(false);
  const rowRef = useRef<HTMLLIElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const shouldRefocusHandleRef = useRef(false);

  function focusAction(action: "more" | "handle"): void {
    rowRef.current?.querySelector<HTMLButtonElement>(`[data-action="${action}"]`)?.focus();
  }

  useEffect(() => {
    if (!isMenuOpen) return;
    function closeOnOutsideClick(event: globalThis.MouseEvent): void {
      if (event.target instanceof Node && !menuRef.current?.contains(event.target)) setIsMenuOpen(false);
    }
    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, [isMenuOpen]);

  // Tabbing out must not leave the open menu covering the next row. A focus change with no target
  // (a click on a button in Safari) is not leaving: outside clicks are handled apart.
  function closeMenuWhenFocusLeaves(event: FocusEvent<HTMLDivElement>): void {
    const next = event.relatedTarget;
    if (next instanceof Node && !event.currentTarget.contains(next)) setIsMenuOpen(false);
  }

  function closeMenuOnEscape(event: KeyboardEvent): void {
    if (event.key !== "Escape" || !isMenuOpen) return;
    setIsMenuOpen(false);
    focusAction("more");
  }

  function openForm(action: FormAction): void {
    setIsMenuOpen(false);
    setOpenAction(action);
  }

  // The forms open from the menu, so the focus goes back to its button.
  function closeForm(): void {
    setOpenAction(null);
    focusAction("more");
  }

  function finishForm(notice: AlertNotice): void {
    closeForm();
    onChanged(notice);
    onRefresh();
  }

  // The button is disabled while the confirmation is open, so it can only take the focus once it renders enabled again.
  useEffect(() => {
    if (isConfirmingHandle || !shouldRefocusHandleRef.current) return;
    shouldRefocusHandleRef.current = false;
    focusAction("handle");
  }, [isConfirmingHandle]);

  function cancelHandleConfirmation(): void {
    shouldRefocusHandleRef.current = true;
    setIsConfirmingHandle(false);
  }

  async function markHandled(): Promise<void> {
    if (isHandlingRef.current) return;
    isHandlingRef.current = true;
    setIsHandling(true);

    const result = await onHandle(alert.id);
    isHandlingRef.current = false;
    setIsHandling(false);
    setIsConfirmingHandle(false);
    onChanged(result.ok ? { ok: true, message: HANDLED_MESSAGE } : { ok: false, message: result.message });
  }

  // The link opens the chat by itself; here only the contact is registered.
  async function registerWhatsApp(event: MouseEvent<HTMLAnchorElement>): Promise<void> {
    if (isRegisteringRef.current) {
      event.preventDefault();
      return;
    }
    isRegisteringRef.current = true;
    setIsRegistering(true);
    try {
      await recordContact(alert.client.id, { channel: "whatsapp", alertId: alert.id });
      onChanged({ ok: true, message: CONTACT_REGISTERED_MESSAGE });
      onRefresh();
    } catch (error) {
      // The alert is gone (handled by someone else): the advice to register it another way cannot work.
      const isStale = isStaleAlertError(error);
      onChanged({ ok: false, message: isStale ? apiErrorMessage(error, CONTACT_FAILED_MESSAGE) : CONTACT_FAILED_MESSAGE });
      if (isStale) onRefresh();
    } finally {
      isRegisteringRef.current = false;
      setIsRegistering(false);
    }
  }

  const hasReason = model.actions.includes("reason");

  return (
    <li ref={rowRef} onKeyDown={closeMenuOnEscape} className="px-4 py-4">
      <div className={cn("flex flex-col gap-3", ALERT_ROW_GRID)}>
        <div className="flex min-w-0 items-center gap-3">
          <span
            aria-hidden="true"
            className="flex size-9 shrink-0 items-center justify-center rounded-full border border-line bg-raised text-xs font-semibold"
          >
            {model.initials}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold">{model.name}</p>
            <p className="text-xs text-muted">{model.subtitle}</p>
          </div>
        </div>
        <div>
          <StatusBadge {...model.badge} />
        </div>
        <Headline headline={model.headline} />
        <p className={cn("text-sm", model.lastAttendance === null && "text-muted")}>
          <span className="mr-1 text-xs text-muted xl:sr-only">Última asistencia</span>
          {model.lastAttendance ?? "Sin registro"}
        </p>
        <div className="flex items-center gap-2 xl:justify-end">
          {phone ? (
            <a
              href={whatsappLink(phone)}
              target="_blank"
              rel="noreferrer"
              aria-label={`Escribir por WhatsApp a ${name}`}
              aria-disabled={isRegistering}
              onClick={(event) => void registerWhatsApp(event)}
              className={cn(
                buttonVariants({ variant: "secondary", size: "sm", touchTarget: true }),
                "min-w-11 px-2.5 text-[#25D366] sm:min-w-0",
                isRegistering && "pointer-events-none opacity-50",
              )}
            >
              <WhatsAppIcon className="size-4" />
            </a>
          ) : (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled
              aria-label={`${name} no tiene teléfono cargado`}
              title="Sin teléfono cargado"
              touchTarget
              className="min-w-11 px-2.5 sm:min-w-0"
            >
              <WhatsAppIcon className="size-4" />
            </Button>
          )}
          {model.actions.includes("handle") ? (
            <Button
              data-action="handle"
              type="button"
              variant="secondary"
              size="sm"
              aria-label="Marcar gestionado"
              aria-expanded={isConfirmingHandle}
              disabled={isHandling || isConfirmingHandle}
              onClick={() => setIsConfirmingHandle(true)}
              touchTarget
            >
              <CheckIcon className="size-3.5" />
              Gestionado
            </Button>
          ) : null}
          <div ref={menuRef} onBlur={closeMenuWhenFocusLeaves} className="relative">
            <Button
              data-action="more"
              type="button"
              variant="secondary"
              size="sm"
              aria-label="Más acciones"
              aria-expanded={isMenuOpen}
              aria-controls={isMenuOpen ? menuId : undefined}
              onClick={() => setIsMenuOpen((open) => !open)}
              touchTarget
              className="min-w-11 px-2.5 sm:min-w-0"
            >
              <MoreIcon className="size-4" />
            </Button>
            {isMenuOpen ? (
              <div
                id={menuId}
                className="absolute right-0 top-full z-20 mt-1 min-w-52 rounded border border-line bg-raised p-1 shadow-lg"
              >
                {hasReason ? (
                  <button type="button" className={MENU_ITEM_CLASS} onClick={() => openForm("reason")}>
                    Registrar motivo
                  </button>
                ) : null}
                <button type="button" className={MENU_ITEM_CLASS} onClick={() => openForm("contact")}>
                  Otro canal de contacto
                </button>
                <Link
                  href={`${ROUTES.STAFF_CLIENTS}/${alert.client.id}`}
                  className={MENU_ITEM_CLASS}
                  onClick={() => setIsMenuOpen(false)}
                >
                  Ver historial
                </Link>
              </div>
            ) : null}
          </div>
        </div>
      </div>
      {openAction === "contact" ? (
        <ContactForm
          clientId={alert.client.id}
          clientName={name}
          clientPhone={phone}
          alertId={alert.id}
          onDone={finishForm}
          onCancel={closeForm}
        />
      ) : null}
      {openAction === "reason" ? (
        <InactivityReasonForm clientId={alert.client.id} onDone={finishForm} onCancel={closeForm} />
      ) : null}
      {isConfirmingHandle ? (
        <div role="group" aria-label="Marcar gestionado" className="mt-4 rounded border border-line p-4">
          <p className="text-sm">¿Marcar como gestionado? La alerta se removeará de la lista.</p>
          <div className="mt-3 flex flex-wrap gap-3">
            <Button type="button" variant="secondary" size="sm" onClick={cancelHandleConfirmation} touchTarget>
              Volver
            </Button>
            <Button type="button" size="sm" disabled={isHandling} onClick={() => void markHandled()} touchTarget>
              Sí, marcar gestionado
            </Button>
          </div>
        </div>
      ) : null}
    </li>
  );
}
