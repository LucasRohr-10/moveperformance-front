"use client";

import { useRef, useState } from "react";

import { SegmentedControl } from "@/components/ui/segmented-control";
import { ROUTES } from "@/config/constants/routes.constants";
import type { BookableSlot, MySubscriptionsDto, RehabKind } from "@/lib/api/types";

import { BookingGrid } from "../booking-grid";
import type { BookingCart } from "../use-booking-cart";
import { OfflineChargeDialog } from "./offline-charge-dialog";
import type { OfflinePrices } from "./offline-price";
import { createClientBookings, getClientBatchEligibility, getClientSlots } from "./staff-booking-api";
import { type OfflineChargeDetails, toStaffBookingsInput } from "./staff-booking-input";
import { chargedOfflineSlots } from "./staff-cart-copy";
import { staffCartPolicy } from "./staff-cart-policy";
import { useRehabKinds } from "./use-rehab-kinds";

export interface StaffBookingConfig {
  client: { id: string; name: string };
  /** Places left for offline charges, or null when it could not be read (the backend decides). */
  offlineRoom: number | null;
  prices: OfflinePrices;
  onBooked(): void;
}

const REHAB_KIND_OPTIONS: { value: RehabKind; label: string }[] = [
  { value: "evaluation", label: "Evaluación" },
  { value: "followup", label: "Seguimiento" },
];

interface PendingConfirm {
  cart: BookingCart;
  /** The slots charged offline when the dialog opened: the cart empties as soon as it books. */
  slots: BookableSlot[];
}

/** The client's own calendar and cart, booked by Staff on the client's behalf. */
export function StaffBookingGrid({ subscriptions, staff }: { subscriptions: MySubscriptionsDto; staff: StaffBookingConfig }) {
  const { client } = staff;
  const { kindOf, setKind } = useRehabKinds();
  const [pending, setPending] = useState<PendingConfirm | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  // A ref, not state: two clicks in the same tick both see the same render's state.
  const isBusyRef = useRef(false);

  const policy = staffCartPolicy({
    clientName: client.name,
    clientHref: `${ROUTES.STAFF_CLIENTS}/${client.id}`,
    offlineRoom: staff.offlineRoom,
  });

  async function submit(cart: BookingCart, details: OfflineChargeDetails) {
    if (isBusyRef.current) return;
    isBusyRef.current = true;
    setIsBusy(true);
    let booked = false;
    try {
      // The cart handles the result and the errors; `booked` only says whether the request went through.
      await cart.confirm(async (batch) => {
        const result = await createClientBookings(client.id, toStaffBookingsInput(batch, details, kindOf));
        booked = true;
        return result;
      });
    } finally {
      isBusyRef.current = false;
      setIsBusy(false);
      setPending(null);
    }
    if (booked) staff.onBooked();
  }

  function handleConfirm(cart: BookingCart) {
    const slots = chargedOfflineSlots(cart);
    if (slots.length > 0) {
      setPending({ cart, slots });
      return;
    }
    void submit(cart, { paymentMethod: "undecided" });
  }

  return (
    <>
      <BookingGrid
        subscriptions={subscriptions}
        fetchSlots={(service, date) => getClientSlots(client.id, service, date)}
        fetchEligibility={(timeSlotIds) => getClientBatchEligibility(client.id, timeSlotIds)}
        policy={policy}
        renderSlotExtra={(slot) =>
          slot.service === "rehab" ? (
            <SegmentedControl
              aria-label="Tipo de sesión"
              className="mt-1"
              options={REHAB_KIND_OPTIONS}
              value={kindOf(slot.id)}
              onChange={(kind) => setKind(slot.id, kind)}
            />
          ) : null
        }
        showPlanBanner={false}
        onConfirm={handleConfirm}
      />
      {pending ? (
        <OfflineChargeDialog
          slots={pending.slots}
          kindOf={kindOf}
          prices={staff.prices}
          previewFailed={pending.cart.previewStatus === "error"}
          isBusy={isBusy}
          onConfirm={(details) => void submit(pending.cart, details)}
          onCancel={() => setPending(null)}
        />
      ) : null}
    </>
  );
}
