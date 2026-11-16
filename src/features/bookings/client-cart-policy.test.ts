// @vitest-environment node
import { describe, expect, it } from "vitest";

import type { BookableSlot, FailedSlotDto, ServiceType, SlotEligibilityDto } from "@/lib/api/types";

import type { CartState } from "./cart-policy";
import { CLIENT_CART_POLICY } from "./client-cart-policy";
import { groupFailures } from "./booking-cart";

function slotAt(id: string, service: ServiceType, startsAt: string): BookableSlot {
  return {
    id,
    service,
    startsAt,
    endsAt: new Date(new Date(startsAt).getTime() + 3_600_000).toISOString(),
    durationMinutes: 60,
    capacity: 10,
    available: 5,
    isFull: false,
    alreadyBooked: false,
  };
}

const PERF = slotAt("perf", "performance", "2026-10-26T18:00:00.000Z");
const REC = slotAt("rec", "recovery", "2026-10-27T13:00:00.000Z");

function stateWith(batch: BookableSlot[], verdicts: SlotEligibilityDto[]): CartState {
  const byId = new Map(verdicts.map((verdict) => [verdict.timeSlotId, verdict]));
  return { batch, eligibilityOf: (id) => byId.get(id) ?? null, previewStatus: "ready" };
}

describe("CLIENT_CART_POLICY", () => {
  it("titles the cart Tu reserva", () => {
    expect(CLIENT_CART_POLICY.title).toBe("Tu reserva");
  });

  it("keeps Rehab out of the batch", () => {
    expect(CLIENT_CART_POLICY.inBatch("rehab")).toBe(false);
    expect(CLIENT_CART_POLICY.inBatch("performance")).toBe(true);
    expect(CLIENT_CART_POLICY.inBatch("recovery")).toBe(true);
  });

  it("allows several slots only for Performance, or Recovery with a pack", () => {
    expect(CLIENT_CART_POLICY.allowsMulti("rehab", { untilDate: "2026-11-21", maxSlots: null })).toBe(false);
    expect(CLIENT_CART_POLICY.allowsMulti("performance", null)).toBe(true);
    expect(CLIENT_CART_POLICY.allowsMulti("recovery", null)).toBe(false);
    expect(CLIENT_CART_POLICY.allowsMulti("recovery", { untilDate: "2026-11-21", maxSlots: 2 })).toBe(true);
  });

  it("blocks on an uncovered slot", () => {
    const blocked = stateWith([PERF], [{ timeSlotId: "perf", covered: false, reason: "PLAN_REQUIRED" }]);
    const covered = stateWith([PERF], [{ timeSlotId: "perf", covered: true, reason: null }]);
    const unknown = stateWith([PERF], [{ timeSlotId: "perf", covered: null, reason: "NOT_APPLICABLE" }]);

    expect(CLIENT_CART_POLICY.blockingNotice(blocked)).not.toBeNull();
    expect(CLIENT_CART_POLICY.blockingNotice(covered)).toBeNull();
    expect(CLIENT_CART_POLICY.blockingNotice(unknown)).toBeNull();
    expect(CLIENT_CART_POLICY.blockingNotice({ ...blocked, previewStatus: "loading" })).not.toBeNull();
    expect(CLIENT_CART_POLICY.blockingNotice({ batch: [PERF], eligibilityOf: () => null, previewStatus: "loading" })).toBeNull();
  });

  it("says nothing about the coverage unless the slot is uncovered, and leaves a package to its own action", () => {
    expect(CLIENT_CART_POLICY.coverage(PERF, { timeSlotId: "perf", covered: true, reason: null })).toBeNull();
    expect(CLIENT_CART_POLICY.coverage(PERF, null)).toBeNull();
    expect(CLIENT_CART_POLICY.coverage(PERF, { timeSlotId: "perf", covered: false, reason: "PLAN_REQUIRED" })).toEqual({
      text: "Requiere un plan",
      tone: "neutral",
    });
    expect(CLIENT_CART_POLICY.coverage(REC, { timeSlotId: "rec", covered: false, reason: "PACKAGE_REQUIRED" })).toBeNull();
  });

  it("hints each slot with the client wording", () => {
    expect(CLIENT_CART_POLICY.slotHint({ ...REC, eligibility: { covered: false, reason: "PACKAGE_REQUIRED" } })).toBe(
      "Pagás esta sesión",
    );
    expect(CLIENT_CART_POLICY.slotHint({ ...PERF, eligibility: { covered: true, reason: null } })).toBe(
      "Incluido en tu plan",
    );
    expect(CLIENT_CART_POLICY.slotHint(PERF)).toBeNull();
  });

  it("shows the pay links and restores the saved pick", () => {
    expect(CLIENT_CART_POLICY.showsPayLinks).toBe(true);
    expect(CLIENT_CART_POLICY.restoresSavedPick).toBe(true);
  });

  it("offers Ver mis reservas after booking", () => {
    expect(CLIENT_CART_POLICY.bookedAction).toEqual({ label: "Ver mis reservas", href: "/dashboard?bookings=open" });
  });

  it("keeps today's failure actions", () => {
    const failed: FailedSlotDto[] = [
      { timeSlotId: "perf", code: "PLAN_REQUIRED", message: "Necesitás un plan activo." },
      { timeSlotId: "rec", code: "PACKAGE_REQUIRED", message: "Necesitás un paquete." },
    ];
    const slots = new Map([PERF, REC].map((slot) => [slot.id, slot]));
    const groups = groupFailures(failed, slots, (service) => service);

    const actions = CLIENT_CART_POLICY.failureActions(failed, groups, (id) => slots.get(id));

    expect(actions).toEqual([
      { label: "Ver planes", href: "/plans" },
      { label: "Pagar esta sesión", href: "/checkout/reserva?service=recovery&date=2026-10-27&slot=rec" },
    ]);
  });
});
