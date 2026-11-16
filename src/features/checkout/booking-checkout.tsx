import { parseServiceType } from "@/features/bookings/types";
import type { BookableSlot, PlanDto, ServiceType } from "@/lib/api/types";

import { CheckoutMessageCard } from "./checkout-message-card";
import { bookingCheckoutHrefFor, bookingsHref } from "./checkout-routes";
import { getBookingPlan, getCheckoutSlot, getOfflineOptions } from "./checkout-server-api";
import { OfflineNotice } from "./offline-notice";
import { BookingPayButton } from "./pay-button";
import { PlanCheckoutView, PlanSummaryCard } from "./plan-checkout-view";
import {
  isSlotBookable,
  presentBookingCheckout,
  presentBookingPaymentModes,
  presentOfflineNotice,
} from "./present-checkout";

export interface BookingCheckoutProps {
  service: string | undefined;
  date: string | undefined;
  slotId: string | undefined;
}

const ONLINE_BOOKING_SERVICES: readonly ServiceType[] = ["rehab", "recovery"];
const FALLBACK_PICKER_SERVICE: ServiceType = "rehab";

/** The service the "volver"/"elegir otro horario" links fall back to when the URL's is missing or unknown. */
export function pickerServiceFor(service: string | undefined): ServiceType {
  return parseServiceType(service) ?? FALLBACK_PICKER_SERVICE;
}

const isBookable = (slot: BookableSlot | null): slot is BookableSlot =>
  slot !== null && isSlotBookable(slot, Date.now());

async function loadBooking(
  service: ServiceType,
  date: string,
  slotId: string,
): Promise<{ plan: PlanDto | null; slot: BookableSlot | null } | undefined> {
  try {
    const [plan, slot] = await Promise.all([getBookingPlan(service), getCheckoutSlot({ service, date, slotId })]);
    return { plan, slot };
  } catch {
    return undefined;
  }
}

export async function BookingCheckout({ service, date, slotId }: BookingCheckoutProps) {
  const pickerService = pickerServiceFor(service);
  const unavailable = (
    <CheckoutMessageCard
      title="Ese horario ya no está disponible"
      body="Elegí otro horario para continuar."
      action={{ label: "Elegir otro horario", href: bookingsHref(pickerService) }}
    />
  );

  if (!ONLINE_BOOKING_SERVICES.includes(pickerService) || service !== pickerService || !date || !slotId) {
    return unavailable;
  }

  const [booking, offline] = await Promise.all([loadBooking(pickerService, date, slotId), getOfflineOptions()]);

  if (booking === undefined) {
    const retry = bookingCheckoutHrefFor({ service: pickerService, date, slotId });
    return (
      <CheckoutMessageCard
        isAlert
        title="No pudimos cargar tu reserva."
        body="Probá de nuevo en unos minutos."
        action={{ label: "Reintentar", href: retry }}
      />
    );
  }

  if (!isBookable(booking.slot)) return unavailable;

  if (booking.plan === null) {
    return (
      <CheckoutMessageCard
        title="Este servicio no se puede pagar online por ahora."
        body="Volvé a intentarlo más tarde."
        action={{ label: "Volver", href: bookingsHref(pickerService) }}
      />
    );
  }

  const model = presentBookingCheckout(booking.plan, booking.slot);
  const offlineNotice = presentOfflineNotice(booking.plan, offline);

  return (
    <PlanCheckoutView
      model={model}
      notice={offlineNotice ? <OfflineNotice segments={offlineNotice} /> : null}
      rightColumn={
        <PlanSummaryCard>
          <BookingPayButton
            key={booking.slot.id}
            planId={booking.plan.id}
            timeSlotId={booking.slot.id}
            service={pickerService}
            paymentModes={presentBookingPaymentModes(booking.plan, offline)}
            price={model.price}
            holdNotice={model.holdNotice}
            emphasized
          />
        </PlanSummaryCard>
      }
    />
  );
}
