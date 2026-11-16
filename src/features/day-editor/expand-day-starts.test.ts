import { describe, expect, it } from "vitest";

import { expandDayStarts, lastSlotEnd } from "./expand-day-starts";

describe("expandDayStarts", () => {
  it("steps by duration plus gap and keeps the starts whose slot ends by the end time", () => {
    expect(expandDayStarts("08:00", "10:45", 45, 15)).toEqual(["08:00", "09:00", "10:00"]);
  });

  it("drops a start whose slot would run past the end time", () => {
    expect(expandDayStarts("08:00", "10:00", 45, 15)).toEqual(["08:00", "09:00"]);
  });

  it("is empty when not even one slot fits", () => {
    expect(expandDayStarts("08:00", "08:30", 45, 15)).toEqual([]);
  });

  it("tells when the last slot ends exactly at the end time", () => {
    expect(lastSlotEnd("08:00", "10:45", 45, 15)).toBe("10:45");
    expect(lastSlotEnd("08:00", "10:00", 45, 15)).toBe("09:45");
    expect(lastSlotEnd("08:00", "08:30", 45, 15)).toBeNull();
  });
});
