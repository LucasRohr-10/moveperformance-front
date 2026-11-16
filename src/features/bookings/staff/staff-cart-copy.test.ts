// @vitest-environment node
import { describe, expect, it } from "vitest";

import type { BookableSlot, ServiceType, SlotEligibilityDto } from "@/lib/api/types";

import type { CartState } from "../cart-policy";
import {
  chargedOfflineSlots,
  offlineOverflow,
  offlineOverflowText,
  offlineSlotTitle,
  staffCoverage,
} from "./staff-cart-copy";

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

const PERF = slotAt("perf", "performance", "2026-11-03T12:00:00.000Z");
const REC_A = slotAt("rec-a", "recovery", "2026-11-04T13:00:00.000Z");
const REC_B = slotAt("rec-b", "recovery", "2026-11-05T13:00:00.000Z");
const REHAB = slotAt("rehab", "rehab", "2026-11-03T11:00:00.000Z");

function stateWith(
  batch: BookableSlot[],
  verdicts: SlotEligibilityDto[],
  previewStatus: CartState["previewStatus"] = "ready",
): CartState {
  const byId = new Map(verdicts.map((verdict) => [verdict.timeSlotId, verdict]));
  return { batch, eligibilityOf: (id) => byId.get(id) ?? null, previewStatus };
}

describe("staffCoverage", () => {
  it("names what covers the slot (ok), or says it is charged outside (offline)", () => {
    expect(staffCoverage(PERF, { timeSlotId: "perf", covered: true, reason: null })).toEqual({
      text: "Incluido en su plan",
      tone: "ok",
    });
    expect(staffCoverage(REC_A, { timeSlotId: "rec-a", covered: true, reason: null })).toEqual({
      text: "Usa 1 sesión del paquete",
      tone: "ok",
    });
    expect(staffCoverage(REC_A, { timeSlotId: "rec-a", covered: false, reason: "PLAN_REQUIRED" })).toEqual({
      text: "Se cobra por fuera",
      tone: "offline",
    });
    expect(staffCoverage(REHAB, { timeSlotId: "rehab", covered: null, reason: "NOT_APPLICABLE" })).toEqual({
      text: "Se cobra por fuera",
      tone: "offline",
    });
  });

  it("says nothing without a verdict", () => {
    expect(staffCoverage(PERF, null)).toBeNull();
  });
});

describe("chargedOfflineSlots", () => {
  it("labels each slot from the preview", () => {
    const state = stateWith(
      [REC_A, REC_B],
      [
        { timeSlotId: "rec-a", covered: true, reason: null },
        { timeSlotId: "rec-b", covered: false, reason: "PACKAGE_REQUIRED" },
      ],
    );

    expect(chargedOfflineSlots(state).map((slot) => slot.id)).toEqual(["rec-b"]);
  });

  it("counts Rehab, which no plan covers", () => {
    const state = stateWith([REHAB], [{ timeSlotId: "rehab", covered: null, reason: "NOT_APPLICABLE" }]);

    expect(chargedOfflineSlots(state).map((slot) => slot.id)).toEqual(["rehab"]);
  });

  it("counts every slot without a verdict when the preview failed", () => {
    const state = stateWith([PERF, REC_A], [], "error");

    expect(chargedOfflineSlots(state).map((slot) => slot.id)).toEqual(["perf", "rec-a"]);
  });
});

describe("offlineOverflow", () => {
  it("is what exceeds the room, and nothing when the room is unknown", () => {
    expect(offlineOverflow(3, 1)).toBe(2);
    expect(offlineOverflow(1, 1)).toBe(0);
    expect(offlineOverflow(1, 2)).toBe(0);
    expect(offlineOverflow(5, null)).toBe(0);
  });
});

describe("offlineOverflowText", () => {
  it("tells there is no room left", () => {
    expect(offlineOverflowText(0, 1)).toBe(
      "Este cliente llegó al máximo de cosas sin pagar de Configuración. Registrá un pago o quitá los turnos que se cobran por fuera.",
    );
    expect(offlineOverflowText(0, 1)).not.toMatch(/\d/);
  });

  it("tells how many places are left and how many slots to remove, singular or plural", () => {
    expect(offlineOverflowText(1, 1)).toBe(
      "Le queda 1 lugar para reservas por fuera. Quitá 1 turno que se cobra por fuera.",
    );
    expect(offlineOverflowText(1, 2)).toBe(
      "Le queda 1 lugar para reservas por fuera. Quitá 2 turnos que se cobran por fuera.",
    );
    expect(offlineOverflowText(2, 1)).toBe(
      "Le quedan 2 lugares para reservas por fuera. Quitá 1 turno que se cobra por fuera.",
    );
  });
});

describe("offlineSlotTitle", () => {
  it("adds the Rehab kind to a Rehab slot", () => {
    expect(offlineSlotTitle(REHAB, "evaluation")).toBe("Rehab · mar 03/11 08:00 · Evaluación");
    expect(offlineSlotTitle(REHAB, "followup")).toBe("Rehab · mar 03/11 08:00 · Seguimiento");
  });

  it("leaves it out of the other services", () => {
    expect(offlineSlotTitle(slotAt("rec", "recovery", "2026-11-06T13:00:00.000Z"), null)).toBe("Recovery · vie 06/11 10:00");
  });
});
