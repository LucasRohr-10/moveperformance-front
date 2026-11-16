import type { ServiceType } from "@/lib/api/types";

const STORAGE_KEY = "move:pending-slot-intent";
// A Mercado Pago payment routinely outlives a few minutes: two-factor, a bank redirect,
// a cash ticket. This expiry only governs whether the UI offers to restore the pick on
// return — it never bears on the purchase or on a booking already paid, both of which
// live server-side and are unaffected by anything in this file.
const TTL_MS = 60 * 60 * 1000;

export interface PendingSlotIntentItem {
  slotId: string;
  service: ServiceType;
  startsAt: string;
}

export interface PendingSlotIntent {
  v: 2;
  surface: "reservar" | "bookings";
  /** Who picked these: another account signing in on the same tab must not inherit them. */
  userId: string | null;
  /** The slot the user left to pay for on its own, if any. Stays in `slots` until the API
   *  confirms its booking, so a pending or rejected payment does not lose the pick. */
  payingSlotId: string | null;
  /** The purchase this selection is waiting on; attached once the checkout actually starts. */
  externalReference: string | null;
  slots: PendingSlotIntentItem[];
  createdAt: string;
  expiresAt: string;
}

/** "expired" is kept apart from "none" on purpose: a selection that timed out while the
 *  user was paying has to be explained, not dropped in silence. */
export type PendingSlotIntentState =
  | { status: "none" }
  | { status: "expired" }
  | { status: "ready"; intent: PendingSlotIntent };

const NONE: PendingSlotIntentState = { status: "none" };

function write(intent: PendingSlotIntent): void {
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(intent));
}

/**
 * Remembers the slot(s) a signed-in user had picked right before leaving the booking flow
 * to pay — for a plan/pack, or for one session on its own (an external Mercado Pago
 * redirect unmounts the page either way). `sessionStorage` (not `localStorage`) survives
 * that redirect in the same tab but not a closed tab or a new one — matching the intent:
 * resume a flow still in progress, not a stale one from days ago.
 */
export function savePendingSlotIntent(input: {
  surface: PendingSlotIntent["surface"];
  slots: PendingSlotIntentItem[];
  userId?: string | null;
  payingSlotId?: string | null;
}): void {
  if (typeof window === "undefined") return;
  const createdAt = new Date();
  write({
    v: 2,
    surface: input.surface,
    userId: input.userId ?? null,
    payingSlotId: input.payingSlotId ?? null,
    externalReference: null,
    slots: input.slots,
    createdAt: createdAt.toISOString(),
    expiresAt: new Date(createdAt.getTime() + TTL_MS).toISOString(),
  });
}

/** Reads the saved pick, telling an expired one apart from none at all. Passing the
 *  current user discards a selection another account left behind in this tab. */
export function readPendingSlotIntentState(userId?: string | null): PendingSlotIntentState {
  if (typeof window === "undefined") return NONE;
  const raw = window.sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return NONE;

  let intent: PendingSlotIntent;
  try {
    intent = JSON.parse(raw) as PendingSlotIntent;
  } catch {
    clearPendingSlotIntent();
    return NONE;
  }

  // Anything written by an older build has a shape this code cannot trust.
  if (intent.v !== 2 || !Array.isArray(intent.slots)) {
    clearPendingSlotIntent();
    return NONE;
  }
  if (userId !== undefined && intent.userId !== null && intent.userId !== userId) {
    clearPendingSlotIntent();
    return NONE;
  }
  if (new Date(intent.expiresAt).getTime() < Date.now()) {
    clearPendingSlotIntent();
    return { status: "expired" };
  }
  return { status: "ready", intent };
}

export function readPendingSlotIntent(userId?: string | null): PendingSlotIntent | null {
  const state = readPendingSlotIntentState(userId);
  return state.status === "ready" ? state.intent : null;
}

/** Ties the saved selection to the purchase it is now waiting on. A no-op when there is
 *  nothing saved: starting a checkout must never fail over a UI convenience. */
export function attachPurchaseToPendingSlotIntent(externalReference: string): void {
  const intent = readPendingSlotIntent();
  if (!intent) return;
  write({ ...intent, externalReference });
}

/**
 * The API confirmed the booking the user left to pay for: that slot is a reservation now,
 * not a pick, so it leaves the selection. This is the only place it is dropped — while the
 * payment is pending or rejected it stays, so the user never loses the slot they were
 * trying to buy. Idempotent, and inert for a purchase this selection was not waiting on.
 */
export function settlePaidSlotIntent(externalReference: string): void {
  const intent = readPendingSlotIntent();
  if (!intent || intent.payingSlotId === null) return;
  if (intent.externalReference !== null && intent.externalReference !== externalReference) return;
  write({
    ...intent,
    payingSlotId: null,
    slots: intent.slots.filter((slot) => slot.slotId !== intent.payingSlotId),
  });
}

export function clearPendingSlotIntent(): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(STORAGE_KEY);
}
