import type { SnackbarAction } from "@/components/ui/snackbar";
import type { BookableSlot, FailedSlotDto, ServiceType, SlotEligibilityDto } from "@/lib/api/types";

import type { FailedGroup } from "./booking-cart";
import type { RepeatLimit } from "./repeat-limit";

/** What a policy needs to know about the cart to decide whether it can be confirmed. */
export interface CartState {
  /** The slots that would be booked together, in the order they are sent. */
  batch: BookableSlot[];
  eligibilityOf(slotId: string): SlotEligibilityDto | null;
  previewStatus: "idle" | "loading" | "ready" | "error";
}

/** neutral: grey (a warning from the plan); ok: covered; offline: charged outside the platform. */
export type CoverageTone = "neutral" | "ok" | "offline";

export interface CoverageLine {
  text: string;
  tone: CoverageTone;
}

/**
 * Everything that differs between a client booking for themselves and Staff booking for a
 * client. The cart asks; it never checks who is booking.
 */
export interface CartPolicy {
  title: string;
  /** False for a service that is paid on its own and left out of the batch. */
  inBatch(service: ServiceType): boolean;
  allowsMulti(service: ServiceType, limit: RepeatLimit | null): boolean;
  /**
   * null: confirming is allowed. A string: confirming is refused, and a non-empty one is shown
   * above the confirm button. An empty string refuses without a notice (the slots say why).
   */
  blockingNotice(state: CartState): string | null;
  /** The short hint on a slot of the calendar (its own verdict), in the words of whoever is booking. */
  slotHint(slot: BookableSlot): string | null;
  /** The line under a slot in the cart, and how it is coloured. Null shows nothing. */
  coverage(slot: BookableSlot, eligibility: SlotEligibilityDto | null): CoverageLine | null;
  /** Red dot on a slot the plan does not cover, and the links to fix it. */
  showsPayLinks: boolean;
  /** Remember the whole pick when leaving to pay, so it can be restored on return. */
  restoresSavedPick: boolean;
  bookedAction: { label: string; href: string };
  failureActions(
    failed: FailedSlotDto[],
    groups: FailedGroup[],
    slotFor: (id: string) => BookableSlot | undefined,
  ): SnackbarAction[];
}
