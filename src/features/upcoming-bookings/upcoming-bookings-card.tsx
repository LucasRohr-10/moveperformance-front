"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { SectionLabel } from "@/components/ui/section-label";
import { ROUTES } from "@/config/constants/routes.constants";
import type { BookingResponse } from "@/lib/api/types";

import { AllBookingsDialog } from "./all-bookings-dialog";
import { BookingTicket } from "./booking-ticket";
import {
  bookingCountLabel,
  PREVIEW_LIMIT,
  toUpcomingRows,
  type UpcomingBookingRow,
} from "./present-upcoming-bookings";
import { UpcomingBookingRowView } from "./upcoming-booking-row";
import { useCancelBooking } from "./use-cancel-booking";

// `?bookings=open` opens the "Ver todas" pop-up on arrival.
const OPEN_PARAM = "bookings";
const OPEN_VALUE = "open";

export interface UpcomingBookingsCardProps {
  bookings: BookingResponse[];
  /** Business date (YYYY-MM-DD), passed in so the card does not depend on the clock. */
  today: string;
}

export function UpcomingBookingsCard({ bookings, today }: UpcomingBookingsCardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const openedFromAddress = searchParams.get(OPEN_PARAM) === OPEN_VALUE;
  const { cancel, busyId, hiddenIds } = useCancelBooking();
  const [isListOpen, setIsListOpen] = useState(openedFromAddress);
  const [confirming, setConfirming] = useState<UpcomingBookingRow | null>(null);

  const rows = toUpcomingRows(bookings, today).filter((row) => !hiddenIds.has(row.id));
  const hasMore = rows.length > PREVIEW_LIMIT;

  function closeList() {
    setIsListOpen(false);
    if (openedFromAddress) router.replace(ROUTES.DASHBOARD, { scroll: false });
  }

  async function confirmCancel(row: UpcomingBookingRow) {
    await cancel(row);
    setConfirming(null);
  }

  return (
    <Card className="mt-10 max-w-[796px]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <SectionLabel>Tu agenda</SectionLabel>
          <h2 className="mt-2 font-display text-2xl font-extrabold">Próximas reservas</h2>
          <p className="mt-1.5 text-[13px] text-muted">
            {hasMore ? `Mostrando ${PREVIEW_LIMIT} de ${rows.length}` : bookingCountLabel(rows.length)}
          </p>
        </div>
        {hasMore ? (
          <button
            type="button"
            onClick={() => setIsListOpen(true)}
            className="min-h-11 whitespace-nowrap text-[11px] font-semibold uppercase tracking-[0.25em] hover:text-muted sm:min-h-0"
          >
            Ver todas ({rows.length}) →
          </button>
        ) : null}
      </div>

      {rows.length === 0 ? (
        <div className="mt-5 rounded border border-dashed border-line p-7 text-center">
          <p className="mb-4 text-sm text-muted">No tenés reservas próximas.</p>
          <Link href={ROUTES.BOOKINGS} className={buttonVariants({ variant: "primary", touchTarget: true })}>
            Reservar →
          </Link>
        </div>
      ) : (
        <ul className="mt-5 space-y-2.5">
          {rows.slice(0, PREVIEW_LIMIT).map((row) => (
            <li key={row.id}>
              <UpcomingBookingRowView row={row} showMonth onCancel={setConfirming} />
            </li>
          ))}
        </ul>
      )}

      {confirming ? (
        <ConfirmDialog
          title="¿Querés cancelar?"
          confirmLabel="Sí, cancelar"
          cancelLabel="Volver"
          tone="destructive"
          isBusy={busyId === confirming.id}
          onConfirm={() => void confirmCancel(confirming)}
          onCancel={() => setConfirming(null)}
        >
          <BookingTicket row={confirming} />
        </ConfirmDialog>
      ) : null}

      {isListOpen ? (
        <AllBookingsDialog
          rows={rows}
          currentMonthKey={today.slice(0, 7)}
          cancel={cancel}
          busyId={busyId}
          onClose={closeList}
        />
      ) : null}
    </Card>
  );
}
