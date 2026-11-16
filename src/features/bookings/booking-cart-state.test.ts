import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { BookableSlot } from "@/lib/api/types";

import {
  type CartState,
  EMPTY_CART,
  keepOnly,
  removeCartSlot,
  selectionSlots,
  startRepeating,
  stopRepeating,
  toggleCartSlot,
} from "./booking-cart-state";
import type { RepeatLimit } from "./repeat-limit";

function slotAt(id: string, startsAt: string, overrides: Partial<BookableSlot> = {}): BookableSlot {
  return {
    id,
    service: "performance",
    startsAt,
    endsAt: new Date(new Date(startsAt).getTime() + 3_600_000).toISOString(),
    durationMinutes: 60,
    capacity: 10,
    available: 5,
    isFull: false,
    alreadyBooked: false,
    ...overrides,
  };
}

// Mondays 15:00 Montevideo
const MON_26 = slotAt("mon-26", "2026-10-26T18:00:00.000Z");
const MON_02 = slotAt("mon-02", "2026-11-02T18:00:00.000Z");
const MON_09 = slotAt("mon-09", "2026-11-09T18:00:00.000Z", { available: 0, isFull: true });
const MON_16 = slotAt("mon-16", "2026-11-16T18:00:00.000Z");
const RECOVERY = slotAt("rec-27", "2026-10-27T13:00:00.000Z", { service: "recovery" });
const REHAB_A = slotAt("rehab-a", "2026-10-28T13:00:00.000Z", { service: "rehab" });
const REHAB_B = slotAt("rehab-b", "2026-10-29T13:00:00.000Z", { service: "rehab" });
const CANDIDATES = [MON_26, MON_02, MON_09, MON_16];
const LIMIT: RepeatLimit = { untilDate: "2026-11-21", maxSlots: null };
const MULTI: { multi: boolean; limit: RepeatLimit | null } = { multi: true, limit: LIMIT };

const ids = (slots: BookableSlot[]) => slots.map((s) => s.id);
const add = (state: CartState, slot: BookableSlot, options = MULTI) => toggleCartSlot(state, slot, options).state;

describe("booking cart state", () => {
  // The fixtures are fixed dates; freeze the clock so none of them is ever "in the past".
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-20T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("keeps the services in the order they were added", () => {
    const state = add(add(EMPTY_CART, MON_26), RECOVERY);

    expect(state.order).toEqual(["performance", "recovery"]);
  });

  it("drops a service once its last slot is toggled off", () => {
    const state = add(add(add(EMPTY_CART, MON_26), RECOVERY), MON_26);

    expect(state.order).toEqual(["recovery"]);
    expect(state.byService.performance).toBeUndefined();
  });

  it("replaces the single Rehab pick", () => {
    const single = { multi: false, limit: null };
    const state = add(add(EMPTY_CART, REHAB_A, single), REHAB_B, single);

    expect(ids(state.byService.rehab!.picked)).toEqual(["rehab-b"]);
  });

  it("repeats, warns about full weeks and toggles expanded slots on and off", () => {
    const repeating = startRepeating(add(EMPTY_CART, MON_26), "performance", CANDIDATES);
    expect(ids(selectionSlots(repeating.byService.performance!, LIMIT))).toEqual(["mon-26", "mon-02", "mon-16"]);

    const withoutMon02 = add(repeating, MON_02);
    expect(withoutMon02.byService.performance!.removedIds).toEqual(["mon-02"]);
    expect(ids(selectionSlots(withoutMon02.byService.performance!, LIMIT))).toEqual(["mon-26", "mon-16"]);

    const back = add(withoutMon02, MON_02);
    expect(back.byService.performance!.removedIds).toEqual([]);
  });

  it("reports the full weeks of a new pattern added while repeating", () => {
    const repeating = startRepeating(add(EMPTY_CART, MON_26), "performance", CANDIDATES);
    const tuesday = slotAt("tue-27", "2026-10-27T18:00:00.000Z");
    const fullTuesday = slotAt("tue-03", "2026-11-03T18:00:00.000Z", { isFull: true, available: 0 });
    const withCandidates = startRepeating(repeating, "performance", [...CANDIDATES, tuesday, fullTuesday]);

    const { skipped } = toggleCartSlot(withCandidates, tuesday, MULTI);

    expect(ids(skipped)).toEqual(["tue-03", "mon-09"]);
  });

  it("removes a repeated slot by marking it, and a plain one by dropping it", () => {
    const repeating = startRepeating(add(EMPTY_CART, MON_26), "performance", CANDIDATES);
    expect(removeCartSlot(repeating, MON_16).byService.performance!.removedIds).toEqual(["mon-16"]);

    const plain = add(add(EMPTY_CART, MON_26), MON_02);
    expect(ids(removeCartSlot(plain, MON_02).byService.performance!.picked)).toEqual(["mon-26"]);
  });

  it("starts and stops repeating only the given service", () => {
    const state = startRepeating(add(add(EMPTY_CART, MON_26), RECOVERY), "performance", CANDIDATES);

    expect(state.byService.performance!.repeating).toBe(true);
    expect(state.byService.recovery!.repeating).toBe(false);
    expect(stopRepeating(state, "performance").byService.performance!.repeating).toBe(false);
  });

  it("keeps only the given service", () => {
    const state = add(add(add(EMPTY_CART, MON_26), RECOVERY), REHAB_A, { multi: false, limit: null });

    const kept = keepOnly(state, "rehab");

    expect(kept.order).toEqual(["rehab"]);
    expect(Object.keys(kept.byService)).toEqual(["rehab"]);
    expect(keepOnly(add(EMPTY_CART, MON_26), "rehab")).toEqual(EMPTY_CART);
  });
});
