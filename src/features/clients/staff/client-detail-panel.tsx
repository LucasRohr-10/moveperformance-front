"use client";

import Link from "next/link";
import { type FormEvent, useEffect, useId, useState } from "react";

import { StaffPageHeader, StaffPageLoading } from "@/components/layout/staff-page";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { useSnackbar } from "@/components/ui/snackbar";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/table";
import { ROUTES } from "@/config/constants/routes.constants";
import { getPhoneErrorMessage, PhoneInput } from "@/features/auth/phone-input";
import { toE164Phone } from "@/features/auth/phone";
import { ClientFollowupSection } from "@/features/followup";
import { owedSummary, toCollectHref } from "@/features/payments/staff/offline-charge-labels";
import { listOpenOfflineCharges } from "@/features/payments/staff/offline-charges-api";
import type {
  AttendanceStatus,
  ClientBooking,
  ClientDetail,
  ClientPaymentStatus,
  ServiceType,
} from "@/lib/api/types";
import { formatBirthday } from "@/lib/birth-date";
import { cn } from "@/lib/cn";

import { BookForClientLink } from "./book-for-client-link";
import { ClientAccountActions } from "./client-account-actions";
import { formatClientDate } from "./client-dates";
import { DeactivationBanner } from "./deactivation-banner";
import { getClient, updateClientPhone } from "./clients-api";

const SAVE_PHONE_FAILED_MESSAGE = "No pudimos guardar el teléfono. Probá de nuevo.";

const BREADCRUMB = [{ label: "Clientes", href: ROUTES.STAFF_CLIENTS }];

const ATTENDANCE_LABEL: Record<AttendanceStatus, string> = {
  present: "Presente",
  absent: "Ausente",
};

const ATTENDANCE_TONE: Record<AttendanceStatus, "success" | "neutral"> = {
  present: "success",
  absent: "neutral",
};

const PAYMENT_STATUS_LABEL: Record<ClientPaymentStatus, string> = {
  up_to_date: "Al día",
  overdue: "Pago vencido",
};

const PAYMENT_STATUS_TONE: Record<ClientPaymentStatus, "success" | "danger"> = {
  up_to_date: "success",
  overdue: "danger",
};

const BOOKING_STATUS_LABEL: Record<ClientBooking["status"], string> = {
  pending_payment: "Pago pendiente",
  confirmed: "Confirmada",
  cancelled: "Cancelada",
  expired: "Expirada",
};

const SERVICE_LABEL: Record<ServiceType, string> = {
  performance: "Performance",
  rehab: "Rehab",
  recovery: "Recovery",
};

/** The soonest confirmed booking still ahead, if any — bookings carry no service display name, only the broad category. */
function nextBookingOf(bookings: ClientBooking[]): ClientBooking | null {
  const now = Date.now();
  const upcoming = bookings.filter(
    (booking) => booking.status === "confirmed" && new Date(booking.startsAt).getTime() >= now,
  );
  if (upcoming.length === 0) return null;
  return upcoming.reduce((soonest, booking) =>
    new Date(booking.startsAt).getTime() < new Date(soonest.startsAt).getTime() ? booking : soonest,
  );
}

/** Bookings arrive newest-first; the first one with a mark is the last attendance taken. */
function lastAttendanceOf(bookings: ClientBooking[]): ClientBooking | null {
  return bookings.find((booking) => booking.attendance !== null) ?? null;
}

/** Inline edit for the one field staff can correct here: the client's phone. */
function EditPhoneForm({
  initialPhone,
  onSaved,
  onCancel,
}: {
  initialPhone: string | null;
  /** Rejects with the message to show when the server call fails. */
  onSaved: (phone: string) => Promise<void>;
  onCancel: () => void;
}) {
  const inputId = useId();
  const [raw, setRaw] = useState(initialPhone ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const { showSnackbar } = useSnackbar();

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const phone = toE164Phone(raw);
    if (!phone) {
      setError(getPhoneErrorMessage(raw));
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      await onSaved(phone);
      showSnackbar({ tone: "success", title: "Teléfono guardado" });
    } catch {
      showSnackbar({ tone: "danger", title: SAVE_PHONE_FAILED_MESSAGE });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="flex max-w-xs flex-col gap-3">
      {/* No autoFocus: on mobile it opens the keyboard immediately and the browser
          force-scrolls the page to keep the field above it, throwing staff down the screen. */}
      <PhoneInput id={inputId} value={raw} onChange={setRaw} error={error ?? undefined} />
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={isSaving}>
          {isSaving ? "Guardando…" : "Guardar"}
        </Button>
        <Button type="button" variant="secondary" size="sm" disabled={isSaving} onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}

/** Placeholder shaped like the loaded page, instead of a blank screen. */
function LoadingDetail() {
  return (
    <div role="status">
      <span className="sr-only">Cargando la ficha del cliente…</span>
      <StaffPageLoading title="Ficha de cliente" breadcrumb={BREADCRUMB} />
    </div>
  );
}

export function ClientDetailPanel({ clientId }: { clientId: string }) {
  const [client, setClient] = useState<ClientDetail | null>(null);
  const [hasFailed, setHasFailed] = useState(false);
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  // How many turns the client has booked and not paid. Only a notice: if the lookup fails there is none.
  // Kept with the id it was asked for, so a different client never shows the previous one's number.
  const [owed, setOwed] = useState<{ clientId: string; summary: string | null } | null>(null);
  const owedSummaryText = owed?.clientId === clientId ? owed.summary : null;
  // Mobile only: the bookings and follow-up cards don't fit side by side, so one shows at a time.
  const [section, setSection] = useState<"follow" | "bookings">("follow");

  async function savePhone(phone: string): Promise<void> {
    const updated = await updateClientPhone(clientId, phone);
    setClient(updated);
    setIsEditingPhone(false);
  }

  function fetchClient() {
    return getClient(clientId)
      .then(setClient)
      .catch(() => setHasFailed(true));
  }

  /** A retry: clear the previous failure before asking again. */
  function load() {
    setHasFailed(false);
    return fetchClient();
  }

  useEffect(() => {
    void fetchClient();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  useEffect(() => {
    let isCurrent = true;
    listOpenOfflineCharges({ clientId }).then(
      (result) => {
        if (isCurrent) setOwed({ clientId, summary: owedSummary(result.items) });
      },
      () => undefined,
    );
    return () => {
      isCurrent = false;
    };
  }, [clientId]);

  if (hasFailed) {
    return (
      <>
        <StaffPageHeader title="Ficha de cliente" breadcrumb={BREADCRUMB} />
        <Card padding="none">
          <EmptyState
            title="No pudimos cargar el cliente"
            description="Puede ser un problema temporario del servidor."
            role="alert"
            action={
              <Button variant="secondary" touchTarget onClick={load}>
                Reintentar
              </Button>
            }
          />
        </Card>
      </>
    );
  }

  if (!client) return <LoadingDetail />;

  const fullName = `${client.name} ${client.lastName ?? ""}`.trim();
  const nextBooking = nextBookingOf(client.bookings);
  const lastAttendance = lastAttendanceOf(client.bookings);

  return (
    <>
      <StaffPageHeader
        title={fullName}
        breadcrumb={BREADCRUMB}
        action={
          <div className="flex flex-wrap gap-2">
            <BookForClientLink client={client} />
            <ClientAccountActions client={client} onClientChange={setClient} onReload={load} />
          </div>
        }
      />

      <div className="space-y-6">
        {client.deactivation ? <DeactivationBanner deactivation={client.deactivation} /> : null}
        {owedSummaryText ? (
          <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            <span className="font-medium text-danger">{owedSummaryText}</span>
            <Link href={toCollectHref(clientId)} className="underline underline-offset-2 hover:no-underline">
              Ver en Pagos →
            </Link>
          </p>
        ) : null}
        <Card padding="none">
          <div className="flex flex-col divide-y divide-line sm:flex-row sm:flex-wrap sm:items-center sm:gap-4 sm:divide-y-0 sm:p-7 sm:pb-0">
            <div className="flex flex-col gap-1 p-4 sm:p-0">
              <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">Email</span>
              <a href={`mailto:${client.email}`} className="text-sm text-white hover:underline">
                {client.email}
              </a>
            </div>

            <div className="p-4 sm:border-l sm:border-line sm:p-0 sm:pl-8">
              {isEditingPhone ? (
                <EditPhoneForm
                  initialPhone={client.phone}
                  onSaved={savePhone}
                  onCancel={() => setIsEditingPhone(false)}
                />
              ) : (
                <div className="flex items-center justify-between gap-3 sm:items-start">
                  <span className="flex flex-col gap-1">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">
                      Teléfono
                    </span>
                    {client.phone ? (
                      <a
                        href={`tel:${client.phone}`}
                        className="text-sm tabular-nums tracking-[0.02em] text-white hover:underline"
                      >
                        {client.phone}
                      </a>
                    ) : (
                      <span className="text-sm text-muted">Sin teléfono</span>
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsEditingPhone(true)}
                    className="h-11 shrink-0 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted underline underline-offset-2 hover:text-white sm:h-auto"
                  >
                    Editar
                  </button>
                </div>
              )}
            </div>

            <div className="p-4 sm:ml-auto sm:p-0">
              <Link
                href={`${ROUTES.STAFF_PAYMENTS}?clientId=${clientId}`}
                className="text-sm underline underline-offset-2 hover:no-underline"
              >
                Ver pagos →
              </Link>
            </div>
          </div>

          <dl className="grid grid-cols-2 border-t border-line sm:mx-7 sm:mt-6 sm:mb-7 sm:grid-cols-[repeat(auto-fit,minmax(220px,1fr))] sm:gap-x-6 sm:gap-y-4 sm:border-t sm:pt-6">
            <div className="border-r border-b border-line/60 px-4 py-3.5 sm:border-0 sm:p-0">
              <dt className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted sm:text-xs sm:tracking-[0.05em]">
                Próxima reserva
              </dt>
              <dd className="mt-1 text-sm">
                {nextBooking
                  ? `${formatClientDate(nextBooking.startsAt)} · ${SERVICE_LABEL[nextBooking.service]}`
                  : "Sin reservas"}
              </dd>
            </div>
            <div className="border-b border-line/60 px-4 py-3.5 sm:border-0 sm:p-0">
              <dt className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted sm:text-xs sm:tracking-[0.05em]">
                Última asistencia
              </dt>
              <dd className="mt-1 flex items-center gap-2 text-sm">
                {lastAttendance?.attendance ? (
                  <>
                    <StatusBadge
                      label={ATTENDANCE_LABEL[lastAttendance.attendance]}
                      tone={ATTENDANCE_TONE[lastAttendance.attendance]}
                    />
                    <span className="text-muted">{formatClientDate(lastAttendance.startsAt)}</span>
                  </>
                ) : (
                  <span className="text-muted">—</span>
                )}
              </dd>
            </div>
            <div className="border-r border-b border-line/60 px-4 py-3.5 sm:border-0 sm:p-0">
              <dt className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted sm:text-xs sm:tracking-[0.05em]">
                Cliente desde
              </dt>
              <dd className="mt-1 text-sm">{formatClientDate(client.clientSince)}</dd>
            </div>
            <div className="border-b border-line/60 px-4 py-3.5 sm:border-0 sm:p-0">
              <dt className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted sm:text-xs sm:tracking-[0.05em]">
                Plan
              </dt>
              <dd className="mt-1 flex items-center gap-2 text-sm">
                {client.plan ? (
                  <>
                    <span>{client.plan.name}</span>
                    {client.deactivation ? (
                      <StatusBadge label="Inactivo · cliente dado de baja" tone="neutral" />
                    ) : (
                      <StatusBadge
                        label={PAYMENT_STATUS_LABEL[client.paymentStatus ?? "overdue"]}
                        tone={PAYMENT_STATUS_TONE[client.paymentStatus ?? "overdue"]}
                      />
                    )}
                  </>
                ) : (
                  <span className="text-muted">Sin plan</span>
                )}
              </dd>
            </div>
            <div className="col-span-2 px-4 py-3.5 sm:col-span-1 sm:p-0">
              <dt className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted sm:text-xs sm:tracking-[0.05em]">
                Edad
              </dt>
              <dd className={cn("mt-1 text-sm", client.age === null && "text-muted")}>
                {client.birthDate !== null && client.age !== null
                  ? `${client.age} años · ${formatBirthday(client.birthDate)}`
                  : "—"}
              </dd>
            </div>
          </dl>
        </Card>

        {/* Mobile: one section at a time. Desktop (lg+) shows both side by side below. */}
        <div role="tablist" className="grid grid-cols-2 overflow-hidden rounded border border-line lg:hidden">
          <button
            type="button"
            role="tab"
            aria-selected={section === "follow"}
            onClick={() => setSection("follow")}
            className={cn(
              "h-11 text-[11px] font-semibold uppercase tracking-[0.2em]",
              section === "follow" ? "bg-white text-black" : "bg-soft text-muted",
            )}
          >
            Seguimiento
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={section === "bookings"}
            onClick={() => setSection("bookings")}
            className={cn(
              "h-11 border-l border-line text-[11px] font-semibold uppercase tracking-[0.2em]",
              section === "bookings" ? "bg-white text-black" : "bg-soft text-muted",
            )}
          >
            Reservas
          </button>
        </div>

        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
          <Card padding="none" className={cn(section === "bookings" ? "block" : "hidden", "lg:block")}>
            {client.bookings.length === 0 ? (
              <EmptyState
                title="Sin reservas"
                description="Este cliente todavía no reservó ningún turno."
                className="m-4 rounded border border-dashed border-line py-8 sm:m-0 sm:rounded-none sm:border-0 sm:py-12"
              />
            ) : (
              <Table caption="Historial de reservas">
                <TableHeader>
                  <TableHeaderCell>Fecha</TableHeaderCell>
                  <TableHeaderCell>Servicio</TableHeaderCell>
                  <TableHeaderCell>Estado</TableHeaderCell>
                  <TableHeaderCell>Asistencia</TableHeaderCell>
                </TableHeader>
                <TableBody>
                  {client.bookings.map((booking) => (
                    <TableRow key={booking.id}>
                      <TableCell className="whitespace-nowrap">
                        <Link
                          href={`${ROUTES.STAFF_SCHEDULE}/${booking.slotId}`}
                          className="underline underline-offset-2 hover:no-underline"
                        >
                          {formatClientDate(booking.startsAt)}
                        </Link>
                      </TableCell>
                      <TableCell>{SERVICE_LABEL[booking.service]}</TableCell>
                      <TableCell>{BOOKING_STATUS_LABEL[booking.status]}</TableCell>
                      <TableCell>
                        {booking.attendance ? (
                          <StatusBadge
                            label={ATTENDANCE_LABEL[booking.attendance]}
                            tone={ATTENDANCE_TONE[booking.attendance]}
                          />
                        ) : (
                          "—"
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>

          <div className={cn(section === "follow" ? "block" : "hidden", "lg:block")}>
            <ClientFollowupSection
              clientId={clientId}
              clientName={fullName}
              clientPhone={client.phone}
              clientEmail={client.email}
            />
          </div>
        </div>
      </div>
    </>
  );
}
