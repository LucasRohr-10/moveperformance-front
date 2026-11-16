import { ROUTES } from "@/config/constants/routes.constants";
import { formatSlotDayTime } from "@/features/checkout/business-time";
import { bookingCheckoutHref } from "@/features/checkout/checkout-routes";
import { unpaidThings } from "@/features/checkout/present-checkout";
import type { SnackbarInput } from "@/components/ui/snackbar";
import { ApiError } from "@/lib/api/errors";
import { formatPrice } from "@/lib/money";
import type { BookableSlot, FailedSlotDto, OfflineOptionsDto } from "@/lib/api/types";

export interface BookingErrorAction {
  label: string;
  href: string;
}

export interface BookingFailure {
  message: string;
  action: BookingErrorAction | null;
}

export const BOOKING_FAILED_MESSAGE = "No pudimos crear tu reserva. Probá de nuevo.";

// Shared by the single-booking flow (/reservar) and the authenticated batch flow
// (/bookings), so both surfaces guide the user with the same quality of action.
export const BOOKING_ERROR_ACTIONS: Record<string, (slot: BookableSlot) => BookingErrorAction> = {
  PACKAGE_REQUIRED: (slot) => ({
    label: "Pagar esta sesión",
    href: bookingCheckoutHref({ service: slot.service, slotId: slot.id, startsAt: slot.startsAt }),
  }),
  PLAN_REQUIRED: () => ({ label: "Ver planes", href: ROUTES.PLANS }),
};

// The client owes as many things as Staff allows: it gets its own notice, with what it owes.
export const UNPAID_LIMIT_REACHED = "UNPAID_LIMIT_REACHED";

const UNPAID_LIMIT_TITLE = "No podés reservar hasta pagar";
const UNPAID_LIMIT_NOTE = "Cuando Staff registre el pago vas a poder reservar de nuevo.";

// The API names every turn of a Performance plan by its service ("Entrenamiento semi personalizado"), so that turn is
// told by its day and time, as the mockup does; a plan, by its name; a session or evaluation bought on its own, by its
// name and when it is.
function unpaidItemText({ kind, label, amount, startsAt }: OfflineOptionsDto["unpaid"]["items"][number]): string {
  const what = unpaidWhat(kind, label, startsAt);
  return amount === null ? what : `${what} · ${formatPrice(amount)}`;
}

function unpaidWhat(kind: OfflineOptionsDto["unpaid"]["items"][number]["kind"], label: string, startsAt: string | null): string {
  if (kind === "plan" || startsAt === null) return label;
  return kind === "booking" ? `${label} · ${formatSlotDayTime(startsAt)}` : `Turno del ${formatSlotDayTime(startsAt)}`;
}

/**
 * The red notice for a booking refused because of the unpaid cap. Without the list of what the client owes
 * (the request for it failed) it falls back to the API's own sentence.
 */
export function unpaidLimitSnackbar(reason: string, unpaid: OfflineOptionsDto["unpaid"] | null): SnackbarInput {
  if (!unpaid) return { tone: "danger", title: UNPAID_LIMIT_TITLE, message: reason };
  return {
    tone: "danger",
    title: UNPAID_LIMIT_TITLE,
    message: `Tenés ${unpaidThings(unpaid.count)} sin pagar en MOVE, que es el máximo:`,
    groups: [{ items: unpaid.items.map(unpaidItemText), note: UNPAID_LIMIT_NOTE }],
  };
}

// The "Pagar esta sesión" action already says why the slot is not covered, so the reason
// text next to it would repeat the same sentence.
export const REASON_SPOKEN_BY_ITS_ACTION = "PACKAGE_REQUIRED";

export function toBookingFailure(error: unknown, slot: BookableSlot): BookingFailure {
  if (!(error instanceof ApiError)) return { message: BOOKING_FAILED_MESSAGE, action: null };
  return { message: error.body.message, action: BOOKING_ERROR_ACTIONS[error.body.code]?.(slot) ?? null };
}

/**
 * A single action for a batch of failures: only when every failure shares the same
 * actionable code, built off the first failed slot. Mixed codes (or a code with no
 * mapped action) offer nothing, same as the single-booking path's fallback — better
 * no action than a misleading one that only fixes some of the failures shown.
 */
export function batchFailureAction(
  failures: FailedSlotDto[],
  slotFor: (timeSlotId: string) => BookableSlot | undefined,
): BookingErrorAction | null {
  if (failures.length === 0) return null;
  const codes = new Set(failures.map((failure) => failure.code));
  if (codes.size !== 1) return null;
  const [code] = codes;
  const builder = BOOKING_ERROR_ACTIONS[code];
  if (!builder) return null;
  const slot = slotFor(failures[0].timeSlotId);
  return slot ? builder(slot) : null;
}
