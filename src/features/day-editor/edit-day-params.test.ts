import { describe, expect, it } from "vitest";

import { formatEditDayScope, parseEditDayParams } from "./edit-day-params";

const TODAY = "2026-11-10";

describe("parseEditDayParams", () => {
  it("accepts a single day, today included", () => {
    expect(parseEditDayParams("2026-11-12", undefined, TODAY)).toEqual({ from: "2026-11-12" });
    expect(parseEditDayParams(TODAY, undefined, TODAY)).toEqual({ from: TODAY });
  });

  it("treats `to` equal to `date` as a single day", () => {
    expect(parseEditDayParams("2026-11-12", "2026-11-12", TODAY)).toEqual({ from: "2026-11-12" });
  });

  it("accepts a range inside the window", () => {
    expect(parseEditDayParams("2026-11-12", "2026-11-15", TODAY)).toEqual({ from: "2026-11-12", to: "2026-11-15" });
  });

  it.each([
    ["no date", undefined, undefined],
    ["a malformed date", "12/11/2026", undefined],
    ["a date that does not exist", "2026-02-30", undefined],
    ["a day that already passed", "2026-11-09", undefined],
    ["a day beyond the 30-day window", "2026-12-11", undefined],
    ["a range that ends before it starts", "2026-11-15", "2026-11-12"],
    ["a range that ends beyond the window", "2026-11-12", "2026-12-11"],
    ["a malformed `to`", "2026-11-12", "mañana"],
  ])("rejects %s", (_name, date, to) => {
    expect(parseEditDayParams(date, to, TODAY)).toBeNull();
  });

  it("accepts the last day of the window", () => {
    expect(parseEditDayParams("2026-12-10", undefined, TODAY)).toEqual({ from: "2026-12-10" });
  });
});

describe("formatEditDayScope", () => {
  it("names a single day with its weekday and a range by its two ends", () => {
    expect(formatEditDayScope("2026-11-12")).toBe("Jueves 12/11");
    expect(formatEditDayScope("2026-11-12", "2026-11-15")).toBe("Del 12/11 al 15/11");
  });
});
