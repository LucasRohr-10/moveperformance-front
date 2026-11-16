import { describe, expect, it } from "vitest";

import { buildCalendarWeeks, monthLabel, shiftMonthKey } from "./calendar-grid";

describe("buildCalendarWeeks", () => {
  it("pads every week to 7 days and keeps every day of the month, in order", () => {
    const weeks = buildCalendarWeeks("2026-10");

    expect(weeks.every((week) => week.length === 7)).toBe(true);

    const monthDays = weeks.flat().filter((day) => !day.isOutside);
    expect(monthDays).toHaveLength(31);
    expect(monthDays[0]).toMatchObject({ date: "2026-10-01", dayNumber: 1 });
    expect(monthDays[monthDays.length - 1]).toMatchObject({ date: "2026-10-31", dayNumber: 31 });
  });

  it("marks the leading and trailing days from neighboring months as outside", () => {
    const weeks = buildCalendarWeeks("2026-10");
    const firstWeek = weeks[0];
    const lastWeek = weeks[weeks.length - 1];

    const firstMonthDayIndex = firstWeek.findIndex((day) => !day.isOutside);
    if (firstMonthDayIndex > 0) {
      expect(firstWeek.slice(0, firstMonthDayIndex).every((day) => day.isOutside)).toBe(true);
    }

    const lastMonthDayIndex = lastWeek.map((day) => !day.isOutside).lastIndexOf(true);
    if (lastMonthDayIndex < 6) {
      expect(lastWeek.slice(lastMonthDayIndex + 1).every((day) => day.isOutside)).toBe(true);
    }
  });
});

describe("shiftMonthKey", () => {
  it("moves forward and wraps the year", () => {
    expect(shiftMonthKey("2026-10", 1)).toBe("2026-11");
    expect(shiftMonthKey("2026-12", 1)).toBe("2027-01");
  });

  it("moves backward and wraps the year", () => {
    expect(shiftMonthKey("2026-10", -1)).toBe("2026-09");
    expect(shiftMonthKey("2026-01", -1)).toBe("2025-12");
  });
});

describe("monthLabel", () => {
  it("capitalizes the month and includes the year", () => {
    const label = monthLabel("2026-10");
    expect(label.charAt(0)).toBe(label.charAt(0).toUpperCase());
    expect(label.toLowerCase()).toContain("octubre");
    expect(label).toContain("2026");
  });
});
