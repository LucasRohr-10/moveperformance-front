// @vitest-environment node
import { describe, expect, it } from "vitest";

import type { BookableSlot, ServiceType, SlotEligibilityDto } from "@/lib/api/types";

import type { CartState } from "../cart-policy";
import { staffCartPolicy } from "./staff-cart-policy";

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

const A = slotAt("a", "performance", "2026-11-03T12:00:00.000Z");
const B = slotAt("b", "recovery", "2026-11-04T13:00:00.000Z");
const C = slotAt("c", "rehab", "2026-11-05T13:00:00.000Z");
const ALL_CHARGED: SlotEligibilityDto[] = [
  { timeSlotId: "a", covered: false, reason: "PLAN_REQUIRED" },
  { timeSlotId: "b", covered: false, reason: "PACKAGE_REQUIRED" },
  { timeSlotId: "c", covered: null, reason: "NOT_APPLICABLE" },
];

function stateWith(
  batch: BookableSlot[],
  verdicts: SlotEligibilityDto[],
  previewStatus: CartState["previewStatus"] = "ready",
): CartState {
  const byId = new Map(verdicts.map((verdict) => [verdict.timeSlotId, verdict]));
  return { batch, eligibilityOf: (id) => byId.get(id) ?? null, previewStatus };
}

const policy = (offlineRoom: number | null) =>
  staffCartPolicy({ clientName: "Sofía Pérez", clientHref: "/staff/clients/c-1", offlineRoom });

describe("staffCartPolicy", () => {
  it("titles the cart with the client's name", () => {
    expect(policy(null).title).toBe("Reserva para Sofía Pérez");
  });

  it("puts Rehab in the batch and allows several slots of any service", () => {
    const staff = policy(null);

    expect(staff.inBatch("rehab")).toBe(true);
    expect(staff.allowsMulti("rehab", null)).toBe(true);
    expect(staff.allowsMulti("recovery", null)).toBe(true);
    expect(staff.allowsMulti("performance", null)).toBe(true);
  });

  it("does not block for uncovered slots", () => {
    expect(policy(null).blockingNotice(stateWith([A, B, C], ALL_CHARGED))).toBeNull();
  });

  it("blocks confirming when offline slots exceed the room", () => {
    const state = stateWith([A, B, C], ALL_CHARGED);

    expect(policy(1).blockingNotice(state)).toBe(
      "Le queda 1 lugar para reservas por fuera. Quitá 2 turnos que se cobran por fuera.",
    );
    expect(policy(1).blockingNotice(stateWith([A], ALL_CHARGED))).toBeNull();
    expect(policy(0).blockingNotice(stateWith([A], ALL_CHARGED))).toContain("Este cliente llegó al máximo de cosas sin pagar de Configuración.");
  });

  it("does not count what the plan covers against the room", () => {
    const state = stateWith(
      [A, B],
      [
        { timeSlotId: "a", covered: true, reason: null },
        { timeSlotId: "b", covered: false, reason: "PACKAGE_REQUIRED" },
      ],
    );

    expect(policy(1).blockingNotice(state)).toBeNull();
  });

  it("does not block when the room is unknown", () => {
    expect(policy(null).blockingNotice(stateWith([A, B, C], ALL_CHARGED))).toBeNull();
  });

  it("blocks while the preview is loading", () => {
    expect(policy(null).blockingNotice(stateWith([A], [], "loading"))).not.toBeNull();
    expect(policy(5).blockingNotice(stateWith([A], [], "loading"))).not.toBeNull();
  });

  it("does not block when the preview failed and the room is enough", () => {
    expect(policy(2).blockingNotice(stateWith([A], [], "error"))).toBeNull();
  });

  it("describes the coverage per slot, and has no pay links nor saved pick", () => {
    const staff = policy(null);

    expect(staff.coverage(B, { timeSlotId: "b", covered: true, reason: null })).toEqual({
      text: "Usa 1 sesión del paquete",
      tone: "ok",
    });
    expect(staff.showsPayLinks).toBe(false);
    expect(staff.restoresSavedPick).toBe(false);
  });

  it("hints each slot with the Staff wording from the slot's own verdict, never the client's", () => {
    const staff = policy(null);
    const withVerdict = (slot: BookableSlot, eligibility: BookableSlot["eligibility"]) => ({ ...slot, eligibility });

    expect(staff.slotHint(withVerdict(A, { covered: true, reason: null }))).toBe("Incluido en su plan");
    expect(staff.slotHint(withVerdict(B, { covered: true, reason: null }))).toBe("Usa 1 sesión del paquete");
    expect(staff.slotHint(withVerdict(B, { covered: false, reason: "PACKAGE_REQUIRED" }))).toBe("Se cobra por fuera");
    expect(staff.slotHint(withVerdict(C, { covered: null, reason: "NOT_APPLICABLE" }))).toBe("Se cobra por fuera");
    expect(staff.slotHint(withVerdict(A, { covered: false, reason: "PLAN_REQUIRED" }))).toBe("Se cobra por fuera");
    expect(staff.slotHint(A)).toBeNull();
  });

  it("offers Ver ficha after booking and no fix actions on failures", () => {
    const staff = policy(null);

    expect(staff.bookedAction).toEqual({ label: "Ver ficha", href: "/staff/clients/c-1" });
    expect(
      staff.failureActions(
        [{ timeSlotId: "a", code: "PLAN_REQUIRED", message: "x" }],
        [{ code: "PLAN_REQUIRED", reason: "x", turns: ["t"] }],
        () => A,
      ),
    ).toEqual([]);
  });
});
