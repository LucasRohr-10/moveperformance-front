import { ROUTES } from "@/config/constants/routes.constants";

import { batchFailureAction, REASON_SPOKEN_BY_ITS_ACTION } from "./booking-error-actions";
import type { CartPolicy } from "./cart-policy";
import { coverageLabel, coverageText } from "./slots";

// Contract with the "Próximas reservas" card: opens its "Ver todas" pop-up.
export const MY_BOOKINGS_HREF = `${ROUTES.DASHBOARD}?bookings=open`;

// Paid through its own checkout, one slot at a time; never part of the batch.
const CHECKOUT_SERVICE = "rehab";

// A slot the plan does not cover holds the confirm button back; each slot says why, so there is no notice.
const BLOCKED_WITHOUT_NOTICE = "";

export const CLIENT_CART_POLICY: CartPolicy = {
  title: "Tu reserva",
  // Rehab always books one slot (through checkout); Recovery needs a pack to book several.
  inBatch: (service) => service !== CHECKOUT_SERVICE,
  allowsMulti: (service, limit) => service !== CHECKOUT_SERVICE && (service === "performance" || limit !== null),
  blockingNotice: (state) =>
    state.batch.some((slot) => state.eligibilityOf(slot.id)?.covered === false) ? BLOCKED_WITHOUT_NOTICE : null,
  // Only once the preview actually says "not covered": a null verdict (still loading, or a
  // service with no plan concept) shows nothing, never a false warning.
  slotHint: coverageLabel,
  coverage: (_slot, eligibility) => {
    if (eligibility?.covered !== false || eligibility.reason === REASON_SPOKEN_BY_ITS_ACTION) return null;
    const text = coverageText(eligibility);
    return text ? { text, tone: "neutral" } : null;
  },
  showsPayLinks: true,
  restoresSavedPick: true,
  bookedAction: { label: "Ver mis reservas", href: MY_BOOKINGS_HREF },
  // One action per reason, each built from the slots that failed for it; a reason with no
  // fix (a full slot) offers nothing.
  failureActions: (failed, groups, slotFor) =>
    groups.flatMap((group) => {
      const action = batchFailureAction(
        failed.filter((failure) => failure.code === group.code),
        slotFor,
      );
      return action ? [action] : [];
    }),
};
