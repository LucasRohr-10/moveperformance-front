import { describe, expect, it } from "vitest";

import type { DailySlot } from "@/lib/api/types";

import { buildScheduleRows, countLabel, coversSomeone, occupancyPercent } from "./schedule-model";

function slotFixture(overrides: Partial<DailySlot> = {}): DailySlot {
  return {
    id: "slot",
    service: "performance",
    // 10:00 in Montevideo (UTC-3).
    startsAt: "2026-10-01T13:00:00.000Z",
    endsAt: "2026-10-01T14:00:00.000Z",
    capacity: 6,
    booked: 0,
    professionalName: null,
    calendarBlockedAt: null,
    cancelledAt: null,
    cancelReason: null,
    staffEditedAt: null,
    isIndividual: false,
    templateProfessionalName: null,
    unmarkedAttendance: 0,
    ...overrides,
  };
}

const at = (hourUtc: number) => Date.parse(`2026-10-01T${String(hourUtc).padStart(2, "0")}:30:00.000Z`);

describe("buildScheduleRows", () => {
  const performance10 = slotFixture({ id: "p10" });
  const rehab10 = slotFixture({ id: "r10", service: "rehab" });
  const recovery11 = slotFixture({
    id: "rc11",
    service: "recovery",
    startsAt: "2026-10-01T14:00:00.000Z",
    endsAt: "2026-10-01T15:00:00.000Z",
  });

  it("groups the slots by start time, earliest first, services in column order", () => {
    const rows = buildScheduleRows([recovery11, rehab10, performance10], "all", null);

    expect(rows.map((row) => row.time)).toEqual(["10:00", "11:00"]);
    expect(rows[0].slots.map((slot) => slot.id)).toEqual(["p10", "r10"]);
  });

  it("keeps only the filtered service, and drops the hours it has nothing in", () => {
    const rows = buildScheduleRows([performance10, recovery11], "recovery", null);

    expect(rows.map((row) => row.time)).toEqual(["11:00"]);
  });

  it("marks the row with a slot in progress as now, and the rows already over as past", () => {
    // 13:30Z: inside 10:00 (13:00-14:00Z), after nothing, before 11:00.
    const during = buildScheduleRows([performance10, recovery11], "all", at(13));
    expect(during.map((row) => [row.isNow, row.isPast])).toEqual([
      [true, false],
      [false, false],
    ]);

    // 14:30Z: 10:00 is over, 11:00 is in progress.
    const after = buildScheduleRows([performance10, recovery11], "all", at(14));
    expect(after.map((row) => [row.isNow, row.isPast])).toEqual([
      [false, true],
      [true, false],
    ]);
  });

  it("marks nothing without a clock, which is every day but today", () => {
    const rows = buildScheduleRows([performance10, recovery11], "all", null);

    expect(rows.every((row) => !row.isNow && !row.isPast)).toBe(true);
  });
});

describe("slot labels", () => {
  it("shows booked/capacity, or 'Sin reservas' when nobody booked", () => {
    expect(countLabel(slotFixture({ booked: 3 }))).toBe("3/6");
    expect(countLabel(slotFixture({ booked: 0 }))).toBe("Sin reservas");
  });

  it("keeps the numbers on a cancelled slot, even with no bookings", () => {
    expect(countLabel(slotFixture({ booked: 0, cancelledAt: "2026-10-01T10:00:00.000Z" }))).toBe("0/6");
  });

  it("caps the occupancy bar and survives a zero capacity", () => {
    expect(occupancyPercent(slotFixture({ booked: 3, capacity: 6 }))).toBe(50);
    expect(occupancyPercent(slotFixture({ booked: 9, capacity: 6 }))).toBe(100);
    expect(occupancyPercent(slotFixture({ booked: 0, capacity: 0 }))).toBe(0);
  });

  it("says someone covers only when staff edited the slot and the professional differs", () => {
    const edited = "2026-10-01T10:00:00.000Z";
    expect(coversSomeone(slotFixture({ professionalName: "Ana", templateProfessionalName: "Juan", staffEditedAt: edited }))).toBe(true);
    expect(coversSomeone(slotFixture({ professionalName: "Ana", templateProfessionalName: "Juan", staffEditedAt: null }))).toBe(false);
    expect(coversSomeone(slotFixture({ professionalName: "Ana", templateProfessionalName: "Ana", staffEditedAt: edited }))).toBe(false);
  });
});
