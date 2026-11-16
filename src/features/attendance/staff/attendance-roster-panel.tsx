"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useSnackbar } from "@/components/ui/snackbar";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { ROUTES } from "@/config/constants/routes.constants";
import { formatSlotTime } from "@/features/bookings/slots";
import { offlineChargeHref } from "@/features/payments/staff/offline-charge-labels";
import { listOpenOfflineCharges } from "@/features/payments/staff/offline-charges-api";
import { OwesBadge } from "@/features/payments/staff/owes-badge";
import { messagesSnackbar, validationMessagesFrom } from "@/features/scheduling/staff/template-form-model";
import type { AttendanceStatus, BookingSource, DailySlot, OfflineChargeDto, RosterItem } from "@/lib/api/types";

import { cancelBooking, getRoster, markAttendance } from "./attendance-api";

type LoadStatus = "loading" | "ready" | "error";

const STATUS_LABEL: Record<AttendanceStatus, string> = {
  present: "Presente",
  absent: "Ausente",
};

const BOOKING_STATUS_LABEL: Record<RosterItem["status"], string> = {
  pending_payment: "Pago pendiente",
  confirmed: "Confirmada",
  cancelled: "Cancelada",
  expired: "Expirada",
};

// The two options are mutually exclusive, so each button reports whether it
// is the one in effect — same `aria-pressed` convention as the alert filters.
const ATTENDANCE_OPTIONS: AttendanceStatus[] = ["present", "absent"];

// Selected-state coloring by tone: present reads as a confirmation, absent as a
// neutral fact.
const SELECTED_TONE_CLASS: Record<AttendanceStatus, string> = {
  present: "border-success/30 bg-success/10 text-success hover:bg-success/20",
  absent: "border-white/40 bg-white/10 text-white hover:bg-white/15",
};

const REASON_MAX_LENGTH = 200;
const REASON_REQUIRED = "Escribí el motivo: le llega al cliente.";

// What cancelling does with what the client used to pay for the booking.
const CANCEL_CONSEQUENCE: Record<BookingSource, string> = {
  package: "La sesión vuelve a su paquete.",
  plan: "No consume nada de su plan.",
  followup: "No consume nada de su plan.",
  payment: "Lo pagó aparte: va a quedar en Pagos → Para revisar.",
  staff_offline:
    "Se cobra por fuera: si no pagó, el cobro se cierra solo; si ya pagó, va a quedar en Pagos para revisar.",
};

function clientNameOf(item: RosterItem): string {
  return `${item.client.name} ${item.client.lastName ?? ""}`.trim();
}

function LoadingRows() {
  return (
    <TableBody>
      {[0, 1, 2, 3].map((row) => (
        <TableRow key={row}>
          <TableCell>
            <Skeleton className="h-4 w-36 bg-line" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-24 bg-line" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-20 bg-line" />
          </TableCell>
          <TableCell className="hidden md:table-cell" />
          <TableCell />
        </TableRow>
      ))}
    </TableBody>
  );
}

export function AttendanceRosterPanel({
  timeSlotId,
  daySlots = [],
}: {
  timeSlotId: string;
  daySlots?: DailySlot[];
}) {
  const [roster, setRoster] = useState<RosterItem[]>([]);
  // The open charges of the staff_offline bookings, by booking. A failed lookup just leaves it empty.
  const [owedByBooking, setOwedByBooking] = useState<Map<string, OfflineChargeDto>>(new Map());
  const [status, setStatus] = useState<LoadStatus>("loading");
  // Track which booking ids are currently being saved (per-row, not global).
  const [pendingBookingIds, setPendingBookingIds] = useState<Set<string>>(new Set());
  // Which booking's last mark attempt failed, and what it was trying to set,
  // so the error and the retry live on that one row instead of a page banner.
  const { showSnackbar } = useSnackbar();
  const [cancelTarget, setCancelTarget] = useState<RosterItem | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelReasonError, setCancelReasonError] = useState<string | undefined>();
  const [isCancelling, setIsCancelling] = useState(false);

  // The backend refuses a slot that started; hiding the button just saves the round trip.
  // Without the slot (the day's list failed to load) the button stays and the backend decides.
  const [openedAt] = useState(() => Date.now());
  const currentSlot = daySlots.find((slot) => slot.id === timeSlotId);
  const canCancel = !(currentSlot && Date.parse(currentSlot.startsAt) <= openedAt);

  function fetchRoster() {
    return getRoster(timeSlotId)
      .then((items) => {
        // The server only accepts attendance on confirmed bookings, so the
        // others (cancelled, expired, unpaid) would just fail when marked.
        const confirmed = items.filter((item) => item.status === "confirmed");
        setRoster(confirmed);
        setStatus("ready");
        void loadOwed(confirmed);
      })
      .catch(() => setStatus("error"));
  }

  function loadOwed(items: RosterItem[]) {
    // Every booking: staff's own offline ones, a session or evaluation the client chose to pay at MOVE, and the turns
    // of a plan that is still unpaid all have an open charge; the API answers only the ones that do.
    const bookingIds = items.map((item) => item.bookingId);
    if (bookingIds.length === 0) {
      setOwedByBooking(new Map());
      return Promise.resolve();
    }
    return listOpenOfflineCharges({ bookingIds }).then(
      ({ items: charges }) => {
        const owed = new Map<string, OfflineChargeDto>();
        for (const charge of charges) if (charge.bookingId) owed.set(charge.bookingId, charge);
        setOwedByBooking(owed);
      },
      () => setOwedByBooking(new Map()),
    );
  }

  /** A retry: show the skeleton again. */
  function load() {
    setStatus("loading");
    return fetchRoster();
  }

  useEffect(() => {
    void fetchRoster();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeSlotId]);

  async function handleMark(bookingId: string, attendance: AttendanceStatus) {
    if (pendingBookingIds.has(bookingId)) return;
    setPendingBookingIds((ids) => new Set([...ids, bookingId]));
    try {
      const updated = await markAttendance(bookingId, attendance);
      // Patch the roster with just the updated item, not a full refetch.
      setRoster((current) =>
        current.map((item) => (item.bookingId === bookingId ? updated : item)),
      );
    } catch {
      const client = roster.find((item) => item.bookingId === bookingId)?.client;
      showSnackbar({
        tone: "danger",
        title: "No se pudo guardar la asistencia.",
        // Names the client, so two failed rows stack as two snackbars, each with its own retry.
        message: client ? `${client.name} ${client.lastName ?? ""}`.trim() : undefined,
        action: { label: "Reintentar", onClick: () => void handleMark(bookingId, attendance) },
      });
    } finally {
      setPendingBookingIds((ids) => {
        const next = new Set(ids);
        next.delete(bookingId);
        return next;
      });
    }
  }

  function openCancel(item: RosterItem) {
    setCancelReason("");
    setCancelReasonError(undefined);
    setCancelTarget(item);
  }

  async function handleConfirmCancel() {
    if (!cancelTarget || isCancelling) return;
    const reason = cancelReason.trim();
    if (reason === "") {
      setCancelReasonError(REASON_REQUIRED);
      return;
    }
    setIsCancelling(true);
    try {
      const result = await cancelBooking(cancelTarget.bookingId, reason);
      // Stays in the list as "Cancelada" until the next load, which only lists confirmed bookings.
      setRoster((current) =>
        current.map((item) => (item.bookingId === cancelTarget.bookingId ? { ...item, status: "cancelled" } : item)),
      );
      if (result.paymentOutcome === "offline_charge_paid") {
        showSnackbar({
          tone: "warning",
          title: "Ya había pagado: quedó en Pagos para revisar.",
          message: clientNameOf(cancelTarget),
          action: { label: "Ir a Pagos", href: `${ROUTES.STAFF_PAYMENTS}?needsAttention=true` },
        });
      } else {
        showSnackbar({ tone: "success", title: "Reserva cancelada", message: clientNameOf(cancelTarget) });
      }
      setCancelTarget(null);
    } catch (error) {
      showSnackbar(messagesSnackbar(validationMessagesFrom(error), "No se pudo cancelar la reserva"));
    } finally {
      setIsCancelling(false);
    }
  }

  if (status === "error") {
    return (
      <Card padding="none">
        <EmptyState
          title="No pudimos cargar la nómina"
          description="Puede ser un problema temporario del servidor."
          role="alert"
          action={
            <Button variant="secondary" touchTarget onClick={load}>
              Reintentar
            </Button>
          }
        />
      </Card>
    );
  }

  if (status === "ready" && roster.length === 0) {
    return (
      <Card padding="none">
        <EmptyState
          title="Nadie reservó este turno"
          description="Cuando alguien reserve va a aparecer en esta nómina."
        />
      </Card>
    );
  }

  // Compute previous and next slots sorted by startsAt.
  const sortedSlots = [...daySlots].sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const currentIndex = sortedSlots.findIndex((s) => s.id === timeSlotId);
  const prevSlot = currentIndex > 0 ? sortedSlots[currentIndex - 1] : null;
  const nextSlot = currentIndex >= 0 && currentIndex < sortedSlots.length - 1 ? sortedSlots[currentIndex + 1] : null;

  return (
    <div className="space-y-3">
      {status === "loading" ? (
        <p role="status" className="sr-only">
          Cargando la nómina…
        </p>
      ) : null}

      <Card padding="none">
        <Table caption="Nómina del turno">
          <TableHeader>
            <TableHeaderCell>Cliente</TableHeaderCell>
            <TableHeaderCell>Reserva</TableHeaderCell>
            <TableHeaderCell>Asistencia</TableHeaderCell>
            <TableHeaderCell align="center" className="hidden md:table-cell">
              <span className="sr-only">Pago</span>
            </TableHeaderCell>
            <TableHeaderCell align="right">Registrar asistencia</TableHeaderCell>
          </TableHeader>
          {status === "loading" ? (
            <LoadingRows />
          ) : (
            <TableBody>
              {roster.map((item) => {
                const isPending = pendingBookingIds.has(item.bookingId);
                const clientName = clientNameOf(item);
                const isConfirmed = item.status === "confirmed";
                const owed = isConfirmed ? owedByBooking.get(item.bookingId) : undefined;

                return (
                  <TableRow key={item.bookingId}>
                    <TableCell className="font-medium">
                      {clientName}
                      {/* Mobile: the table scrolls sideways and the Pago column is out of sight, so the notice sits here. */}
                      {owed ? (
                        <div className="mt-1 md:hidden">
                          <OwesBadge href={offlineChargeHref(owed.id)} />
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-muted">
                      {BOOKING_STATUS_LABEL[item.status]}
                    </TableCell>
                    <TableCell>
                      {!isConfirmed ? (
                        <span className="text-muted">—</span>
                      ) : isPending ? (
                        <span className="text-muted">Guardando…</span>
                      ) : item.attendance ? (
                        STATUS_LABEL[item.attendance]
                      ) : (
                        <span className="text-muted">Pendiente</span>
                      )}
                    </TableCell>
                    <TableCell align="center" className="hidden md:table-cell">
                      {owed ? <OwesBadge href={offlineChargeHref(owed.id)} /> : null}
                    </TableCell>
                    <TableCell align="right">
                      <div className="flex flex-wrap justify-end gap-2">
                        {isConfirmed && canCancel && item.attendance === null ? (
                          <Button
                            size="sm"
                            touchTarget
                            variant="secondary"
                            disabled={isPending}
                            onClick={() => openCancel(item)}
                          >
                            Cancelar reserva
                          </Button>
                        ) : null}
                        {(isConfirmed ? ATTENDANCE_OPTIONS : []).map((option) => {
                          const isCurrent = item.attendance === option;
                          return (
                            <Button
                              key={option}
                              size="sm"
                              touchTarget
                              variant="secondary"
                              className={isCurrent ? SELECTED_TONE_CLASS[option] : undefined}
                              aria-pressed={isCurrent}
                              disabled={isPending}
                              onClick={() => handleMark(item.bookingId, option)}
                            >
                              {STATUS_LABEL[option]}
                            </Button>
                          );
                        })}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          )}
        </Table>
      </Card>

      {cancelTarget ? (
        <ConfirmDialog
          title={`¿Cancelar la reserva de ${clientNameOf(cancelTarget)}?`}
          confirmLabel="Cancelar reserva"
          cancelLabel="Volver"
          tone="destructive"
          isBusy={isCancelling}
          onConfirm={() => void handleConfirmCancel()}
          onCancel={() => setCancelTarget(null)}
        >
          <p className="mt-3 text-sm leading-relaxed text-muted">{CANCEL_CONSEQUENCE[cancelTarget.source]}</p>
          <div className="mt-4">
            <Textarea
              label="Motivo *"
              rows={3}
              maxLength={REASON_MAX_LENGTH}
              value={cancelReason}
              error={cancelReasonError}
              onChange={(event) => {
                setCancelReason(event.target.value);
                setCancelReasonError(undefined);
              }}
              className="resize-none"
            />
            <p className="mt-1.5 text-[11px] text-muted">Le llega al cliente por mail y como aviso en la app.</p>
          </div>
        </ConfirmDialog>
      ) : null}

      {(prevSlot || nextSlot) && (
        <div className="flex items-center justify-between gap-3">
          {prevSlot ? (
            <Link
              href={`${ROUTES.STAFF_SCHEDULE}/${prevSlot.id}`}
              className="text-sm underline underline-offset-2 hover:no-underline"
            >
              ← Turno anterior ({formatSlotTime(prevSlot.startsAt)})
            </Link>
          ) : (
            <div />
          )}
          {nextSlot ? (
            <Link
              href={`${ROUTES.STAFF_SCHEDULE}/${nextSlot.id}`}
              className="text-sm underline underline-offset-2 hover:no-underline"
            >
              Próximo turno ({formatSlotTime(nextSlot.startsAt)}) →
            </Link>
          ) : null}
        </div>
      )}
    </div>
  );
}
