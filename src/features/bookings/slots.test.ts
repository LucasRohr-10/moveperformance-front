import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { BookableSlot } from "@/lib/api/types";

import {
  buildDesktopRows,
  coverageLabel,
  groupByDaypart,
  isSlotSelectable,
  mondayOf,
  occupancyLevel,
  slotLabel,
  summarizeDay,
} from "./slots";

const NOW = new Date("2026-10-16T12:00:00-03:00");

function slot(overrides: Partial<BookableSlot> = {}): BookableSlot {
  return {
    id: "slot-1",
    service: "rehab",
    startsAt: "2026-10-16T19:00:00.000Z",
    endsAt: "2026-10-16T19:45:00.000Z",
    durationMinutes: 45,
    capacity: 1,
    available: 1,
    isFull: false,
    alreadyBooked: false,
    ...overrides,
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("slotLabel", () => {
  it("labels a past slot as finished regardless of capacity", () => {
    expect(slotLabel(slot({ startsAt: "2026-10-16T10:00:00.000Z" }))).toBe("Finalizado");
  });

  it("labels an already-booked slot distinctly", () => {
    expect(slotLabel(slot({ alreadyBooked: true }))).toBe("Ya reservado");
  });

  it("labels a full slot as complete", () => {
    expect(slotLabel(slot({ isFull: true, available: 0 }))).toBe("Completo");
  });

  it("labels a single-capacity open slot as available, not a count", () => {
    expect(slotLabel(slot({ capacity: 1, available: 1 }))).toBe("Disponible");
  });

  it("flags the last remaining spot in a multi-capacity slot", () => {
    expect(slotLabel(slot({ capacity: 12, available: 1 }))).toBe("Último lugar");
  });

  it("shows the remaining count otherwise", () => {
    expect(slotLabel(slot({ capacity: 12, available: 5 }))).toBe("5 lugares");
  });
});

describe("coverageLabel", () => {
  it("is null when there is no eligibility data (anonymous visitor)", () => {
    expect(coverageLabel(slot({ eligibility: undefined }))).toBeNull();
    expect(coverageLabel(slot({ eligibility: null }))).toBeNull();
  });

  it("says it's included in the plan when covered", () => {
    expect(coverageLabel(slot({ eligibility: { covered: true, reason: null } }))).toBe(
      "Incluido en tu plan",
    );
  });

  it("says a plan is required, not a payment option, for PLAN_REQUIRED (Performance)", () => {
    expect(
      coverageLabel(slot({ eligibility: { covered: false, reason: "PLAN_REQUIRED" } })),
    ).toBe("Requiere un plan");
  });

  it("says the session is paid separately for PACKAGE_REQUIRED (Recovery without a pack)", () => {
    expect(
      coverageLabel(slot({ eligibility: { covered: false, reason: "PACKAGE_REQUIRED" } })),
    ).toBe("Pagás esta sesión");
  });

  it("says the session is paid separately for a not-applicable service (Rehab), never 'requires a plan'", () => {
    expect(
      coverageLabel(slot({ eligibility: { covered: null, reason: "NOT_APPLICABLE" } })),
    ).toBe("Pagás esta sesión");
  });
});

describe("isSlotSelectable", () => {
  it("rejects past, full and already-booked slots", () => {
    expect(isSlotSelectable(slot({ startsAt: "2026-10-16T10:00:00.000Z" }))).toBe(false);
    expect(isSlotSelectable(slot({ isFull: true }))).toBe(false);
    expect(isSlotSelectable(slot({ alreadyBooked: true }))).toBe(false);
  });

  it("accepts a future, open slot", () => {
    expect(isSlotSelectable(slot())).toBe(true);
  });
});

describe("summarizeDay", () => {
  it("marks a day with no generated slots as closed", () => {
    const summary = summarizeDay("2026-10-19", "2026-10-16", []);
    expect(summary.isClosed).toBe(true);
    expect(summary.freeCount).toBe(0);
  });

  it("counts only bookable slots as free", () => {
    const slots = [slot({ id: "a", available: 1 }), slot({ id: "b", isFull: true })];
    const summary = summarizeDay("2026-10-16", "2026-10-16", slots);
    expect(summary.isClosed).toBe(false);
    expect(summary.totalCount).toBe(2);
    expect(summary.freeCount).toBe(1);
  });
});

describe("groupByDaypart", () => {
  it("buckets slots into Mañana, Tarde and Noche by local hour", () => {
    const groups = groupByDaypart([
      slot({ id: "morning", startsAt: "2026-10-16T12:00:00.000Z" }), // 09:00 in Montevideo
      slot({ id: "evening", startsAt: "2026-10-16T22:00:00.000Z" }), // 19:00 in Montevideo
    ]);
    expect(groups.map((g) => g.label)).toEqual(["Mañana", "Noche"]);
  });
});

describe("buildDesktopRows", () => {
  it("aligns slots by local time across days and leaves gaps where a day has none", () => {
    const monday = [slot({ id: "mon", startsAt: "2026-10-19T12:00:00.000Z" })]; // 09:00
    const tuesday: BookableSlot[] = [];
    const rows = buildDesktopRows([monday, tuesday]);

    expect(rows).toHaveLength(1);
    expect(rows[0].time).toBe("09:00");
    expect(rows[0].cells[0]?.slot.id).toBe("mon");
    expect(rows[0].cells[1]).toBeNull();
  });

  it("words each cell's coverage with the given hint, the client's by default", () => {
    const covered = slot({ id: "mon", startsAt: "2026-10-19T12:00:00.000Z", eligibility: { covered: true, reason: null } });

    expect(buildDesktopRows([[covered]])[0].cells[0]?.coverageLabel).toBe("Incluido en tu plan");
    expect(buildDesktopRows([[covered]], undefined, () => "Incluido en su plan")[0].cells[0]?.coverageLabel).toBe(
      "Incluido en su plan",
    );
  });
});

describe("mondayOf", () => {
  it("returns the Monday of the week for any day", () => {
    expect(mondayOf("2026-10-22")).toBe("2026-10-19");
    expect(mondayOf("2026-10-19")).toBe("2026-10-19");
    expect(mondayOf("2026-10-25")).toBe("2026-10-19");
  });
});

describe("occupancyLevel", () => {
  it("is low below the medium threshold", () => {
    expect(occupancyLevel(slot({ capacity: 12, available: 12 }))).toBe("low");
    expect(occupancyLevel(slot({ capacity: 1, available: 1 }))).toBe("low");
  });

  it("is medium from the medium threshold up to 75% occupied", () => {
    expect(occupancyLevel(slot({ capacity: 12, available: 6 }))).toBe("medium");
    expect(occupancyLevel(slot({ capacity: 12, available: 3 }))).toBe("medium");
  });

  it("is high above 75% occupied", () => {
    expect(occupancyLevel(slot({ capacity: 12, available: 2 }))).toBe("high");
  });

  it("is full when the slot is full", () => {
    expect(occupancyLevel(slot({ capacity: 12, available: 0, isFull: true }))).toBe("full");
  });
});
