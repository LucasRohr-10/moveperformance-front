import type { CartPolicy } from "../cart-policy";
import { chargedOfflineSlots, offlineOverflow, offlineOverflowText, staffCoverage } from "./staff-cart-copy";

const PREVIEW_LOADING_NOTICE = "Viendo qué cubre su plan…";

export interface StaffCartPolicyInput {
  clientName: string;
  clientHref: string;
  /** Places left for offline charges, or null when it could not be read (the backend decides). */
  offlineRoom: number | null;
}

/** Staff books any service for a client; what the plan does not cover is charged outside. */
export function staffCartPolicy({ clientName, clientHref, offlineRoom }: StaffCartPolicyInput): CartPolicy {
  return {
    title: `Reserva para ${clientName}`,
    inBatch: () => true,
    allowsMulti: () => true,
    blockingNotice: (state) => {
      if (state.previewStatus === "loading") return PREVIEW_LOADING_NOTICE;
      const overflow = offlineOverflow(chargedOfflineSlots(state).length, offlineRoom);
      return overflow > 0 && offlineRoom !== null ? offlineOverflowText(offlineRoom, overflow) : null;
    },
    slotHint: (slot) => staffCoverage(slot, slot.eligibility ?? null)?.text ?? null,
    coverage: staffCoverage,
    showsPayLinks: false,
    restoresSavedPick: false,
    bookedAction: { label: "Ver ficha", href: clientHref },
    failureActions: () => [],
  };
}
