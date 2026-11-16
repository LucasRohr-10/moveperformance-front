import type { BookableSlot, BookingPaymentChoice, RehabKind, StaffBookingsInput } from "@/lib/api/types";

export interface OfflineChargeDetails {
  paymentMethod: BookingPaymentChoice;
}

/** The body of the staff booking. It has no amount: the backend takes the price from Configuración. */
export function toStaffBookingsInput(
  batch: BookableSlot[],
  details: OfflineChargeDetails,
  kindOf: (slotId: string) => RehabKind,
): StaffBookingsInput {
  return {
    paymentMethod: details.paymentMethod,
    items: batch.map((slot) =>
      slot.service === "rehab"
        ? { timeSlotId: slot.id, rehabKind: kindOf(slot.id) }
        : { timeSlotId: slot.id },
    ),
  };
}
