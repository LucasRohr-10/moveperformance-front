"use client";

import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";

import { useSnackbar } from "@/components/ui/snackbar";

import { cancelBooking } from "./cancel-booking";
import { shortWhen, type UpcomingBookingRow } from "./present-upcoming-bookings";

const FAILED_TITLE = "No pudimos cancelar la reserva";
const FAILED_MESSAGE = "Probá de nuevo en unos minutos.";
const CANCELLED_TITLE = "Reserva cancelada";
const REFUND_MESSAGE = "Ya la pagaste: comunicate con MOVE para ver el reembolso.";

/**
 * Cancels a booking and tells the client how it went. The page is refreshed either way: after a success so the
 * profile (including the Recovery pack that gets its session back) shows what the API says, and after a failure
 * because the usual cause is a stale `canCancel` (the cancellation window closed while the page was open).
 * Whatever the error, the client only sees a fixed message, never the API's.
 */
export function useCancelBooking() {
  const router = useRouter();
  const { showSnackbar } = useSnackbar();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [hiddenIds, setHiddenIds] = useState<ReadonlySet<string>>(() => new Set());
  const inFlight = useRef(new Set<string>());

  const cancel = useCallback(
    async (row: UpcomingBookingRow): Promise<boolean> => {
      if (inFlight.current.has(row.id)) return false;
      inFlight.current.add(row.id);
      setBusyId(row.id);
      try {
        const { contactForRefund } = await cancelBooking(row.id);
        setHiddenIds((previous) => new Set(previous).add(row.id));
        // The refund is arranged outside the app, so that notice stays until the client closes it.
        showSnackbar(
          contactForRefund
            ? { tone: "success", title: CANCELLED_TITLE, message: REFUND_MESSAGE, persistent: true }
            : { tone: "success", title: CANCELLED_TITLE, message: `${row.serviceLabel} · ${shortWhen(row)}` },
        );
        return true;
      } catch {
        showSnackbar({ tone: "danger", title: FAILED_TITLE, message: FAILED_MESSAGE });
        return false;
      } finally {
        inFlight.current.delete(row.id);
        setBusyId(null);
        router.refresh();
      }
    },
    [router, showSnackbar],
  );

  return { cancel, busyId, hiddenIds };
}
