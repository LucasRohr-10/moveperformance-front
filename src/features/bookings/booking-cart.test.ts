import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { BookableSlot } from "@/lib/api/types";

import {
  bookedSummary,
  bookedTitle,
  cartItemLabel,
  expandRepeat,
  failedSlotMessage,
  failedTitle,
  failedTurnLabel,
  groupByDay,
  groupFailures,
  patternOf,
  rehabPayNote,
  repeatPhrase,
  shortDateLabel,
  slotTimeRange,
  turnsCount,
} from "./booking-cart";

// Monday 2026-10-19, 12:00 in Montevideo.
const NOW = new Date("2026-10-19T15:00:00.000Z");

function slotAt(id: string, startsAtUtc: string, overrides: Partial<BookableSlot> = {}): BookableSlot {
  return {
    id,
    service: "performance",
    startsAt: startsAtUtc,
    endsAt: new Date(new Date(startsAtUtc).getTime() + 3_600_000).toISOString(),
    durationMinutes: 60,
    capacity: 10,
    available: 5,
    isFull: false,
    alreadyBooked: false,
    ...overrides,
  };
}

// Mondays at 15:00 Montevideo (18:00Z).
const MON_26 = slotAt("mon-26", "2026-10-26T18:00:00.000Z");
const MON_02 = slotAt("mon-02", "2026-11-02T18:00:00.000Z");
const MON_09 = slotAt("mon-09", "2026-11-09T18:00:00.000Z", { available: 0, isFull: true });
const MON_16 = slotAt("mon-16", "2026-11-16T18:00:00.000Z");
const TUE_27 = slotAt("tue-27", "2026-10-27T18:00:00.000Z");

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("patternOf", () => {
  it("combines the ISO weekday and the Montevideo start time", () => {
    expect(patternOf(MON_26)).toBe("1-15:00");
    expect(patternOf(slotAt("sun", "2026-11-01T21:30:00.000Z"))).toBe("7-18:30");
  });
});

describe("expandRepeat", () => {
  const limit = { untilDate: "2026-11-21", maxSlots: null };

  it("adds the same weekday and time up to the limit and reports full ones as skipped", () => {
    const { slots, skipped } = expandRepeat([MON_26], [MON_26, MON_02, MON_09, MON_16, TUE_27], limit);

    expect(slots.map((s) => s.id)).toEqual(["mon-26", "mon-02", "mon-16"]);
    expect(skipped.map((s) => s.id)).toEqual(["mon-09"]);
  });

  it("stops at the limit date", () => {
    const { slots } = expandRepeat([MON_26], [MON_02, MON_16], { untilDate: "2026-11-05", maxSlots: null });

    expect(slots.map((s) => s.id)).toEqual(["mon-26", "mon-02"]);
  });

  it("keeps only the nearest slots when the limit has a maximum", () => {
    const { slots } = expandRepeat([MON_26], [MON_02, MON_16], { untilDate: "2026-11-21", maxSlots: 2 });

    expect(slots.map((s) => s.id)).toEqual(["mon-26", "mon-02"]);
  });

  it("ignores already booked and past candidates", () => {
    const booked = slotAt("booked", "2026-11-02T18:00:00.000Z", { alreadyBooked: true });
    const past = slotAt("past", "2026-10-12T18:00:00.000Z");

    const { slots, skipped } = expandRepeat([MON_26], [booked, past], limit);

    expect(slots.map((s) => s.id)).toEqual(["mon-26"]);
    expect(skipped).toEqual([]);
  });
});

describe("repeatPhrase", () => {
  it("groups weekdays that share a time", () => {
    const picked = [
      slotAt("a", "2026-10-26T18:00:00.000Z"),
      slotAt("b", "2026-10-28T18:00:00.000Z"),
      slotAt("c", "2026-10-30T21:30:00.000Z"),
    ];

    expect(repeatPhrase(picked)).toBe("Todos los lunes y miércoles a las 15 hrs y los viernes a las 18:30 hrs");
  });

  it("handles a single weekday", () => {
    expect(repeatPhrase([MON_26])).toBe("Todos los lunes a las 15 hrs");
  });
});

describe("failedSlotMessage", () => {
  it("names the weekday, date and Montevideo time", () => {
    expect(failedSlotMessage(slotAt("x", "2026-11-03T18:00:00.000Z"))).toBe(
      "No se pudo agendar el mar 3 nov a las 15:00",
    );
  });
});

describe("cartItemLabel", () => {
  it("shows weekday, day and the start–end range", () => {
    expect(cartItemLabel(MON_26)).toBe("Lun 26 · 15:00–16:00");
  });
});

describe("shortDateLabel", () => {
  it("shows day and month", () => {
    expect(shortDateLabel("2026-11-21")).toBe("21 nov");
  });
});

describe("cart copy", () => {
  const LABELS = { performance: "Performance", rehab: "Fisioterapia", recovery: "Recovery" } as const;
  const labelOf = (service: keyof typeof LABELS) => LABELS[service];
  const MON_26_LATER = slotAt("mon-26b", "2026-10-26T19:05:00.000Z");
  const WED_28 = slotAt("wed-28", "2026-10-28T18:00:00.000Z");
  const THU_29 = slotAt("thu-29", "2026-10-29T18:00:00.000Z");
  const RECOVERY_27 = slotAt("rec-27", "2026-10-27T13:00:00.000Z", { service: "recovery" });

  it("groups the slots by day, in order", () => {
    const groups = groupByDay([TUE_27, MON_26_LATER, MON_26]);

    expect(groups.map((g) => [g.weekday, g.dayNumber, g.slots.map((s) => s.id)])).toEqual([
      ["LUN", 26, ["mon-26", "mon-26b"]],
      ["MAR", 27, ["tue-27"]],
    ]);
    expect(groups[0].date).toBe("2026-10-26");
  });

  it("shows the time range of a slot", () => {
    expect(slotTimeRange(MON_26)).toBe("15:00–16:00");
  });

  it("counts turns in Spanish", () => {
    expect(turnsCount(1)).toBe("1 turno");
    expect(turnsCount(2)).toBe("2 turnos");
  });

  it("names what gets booked before paying Fisioterapia", () => {
    expect(rehabPayNote(["Performance", "Recovery"])).toBe(
      "Después de confirmar Performance y Recovery, te llevamos a pagar este turno.",
    );
    expect(rehabPayNote(["Performance"])).toBe("Después de confirmar Performance, te llevamos a pagar este turno.");
  });

  it("titles the booked and the failed slots", () => {
    expect(bookedTitle(1)).toBe("Turno reservado");
    expect(bookedTitle(3)).toBe("3 turnos reservados");
    expect(failedTitle(1)).toBe("1 turno no se pudo reservar");
    expect(failedTitle(2)).toBe("2 turnos no se pudieron reservar");
  });

  it("sums up what was booked", () => {
    expect(bookedSummary([MON_26, TUE_27, WED_28], labelOf)).toBe("Lun 26, mar 27 y mié 28 · Performance");
    expect(bookedSummary([MON_26, TUE_27, WED_28, THU_29], labelOf)).toBe("Performance");
    expect(bookedSummary([MON_26, RECOVERY_27], labelOf)).toBe("Performance y Recovery");
  });
});

describe("failed bookings", () => {
  const LABELS = { performance: "Performance", recovery: "Recovery", rehab: "Fisioterapia" };
  const labelOf = (service: keyof typeof LABELS) => LABELS[service];
  const REC_27 = slotAt("rec-27", "2026-10-27T13:00:00.000Z", { service: "recovery" });
  const REC_28 = slotAt("rec-28", "2026-10-28T13:00:00.000Z", { service: "recovery" });
  const PERF_26 = slotAt("perf-26", "2026-10-26T12:00:00.000Z");
  const slotsById = new Map([MON_26, REC_27, REC_28, PERF_26].map((slot) => [slot.id, slot]));
  const NEEDS_PACKAGE = "Necesitás un paquete con sesiones disponibles.";

  it("labels a failed turn with the service, the day and the start time", () => {
    expect(failedTurnLabel(MON_26, "Performance")).toBe("Performance · Lun 26 · 15:00");
  });

  it("puts every slot that failed for the same reason in one group, in start order", () => {
    const groups = groupFailures(
      [
        { timeSlotId: "rec-28", code: "PACKAGE_REQUIRED", message: NEEDS_PACKAGE },
        { timeSlotId: "rec-27", code: "PACKAGE_REQUIRED", message: NEEDS_PACKAGE },
      ],
      slotsById,
      labelOf,
    );

    expect(groups).toEqual([
      { code: "PACKAGE_REQUIRED", reason: NEEDS_PACKAGE, turns: ["Recovery · Mar 27 · 10:00", "Recovery · Mié 28 · 10:00"] },
    ]);
  });

  it("makes one group per reason, ordered by the earliest slot of each", () => {
    const groups = groupFailures(
      [
        { timeSlotId: "rec-27", code: "PACKAGE_REQUIRED", message: NEEDS_PACKAGE },
        { timeSlotId: "perf-26", code: "SLOT_FULL", message: "No quedan cupos para este turno." },
      ],
      slotsById,
      labelOf,
    );

    expect(groups.map((group) => group.code)).toEqual(["SLOT_FULL", "PACKAGE_REQUIRED"]);
  });

  it("keeps slots of different services together when the reason is the same", () => {
    const groups = groupFailures(
      [
        { timeSlotId: "mon-26", code: "PLAN_REQUIRED", message: "Necesitás un plan activo." },
        { timeSlotId: "rec-27", code: "PLAN_REQUIRED", message: "Necesitás un plan activo." },
      ],
      slotsById,
      labelOf,
    );

    expect(groups).toHaveLength(1);
    expect(groups[0].turns).toEqual(["Performance · Lun 26 · 15:00", "Recovery · Mar 27 · 10:00"]);
  });

  it("still counts a slot it cannot identify", () => {
    const groups = groupFailures([{ timeSlotId: "ghost", code: "SLOT_FULL", message: "Completo" }], slotsById, labelOf);

    expect(groups[0].turns).toEqual(["Turno sin identificar"]);
  });
});
