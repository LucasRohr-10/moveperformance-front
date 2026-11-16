import { describe, expect, it } from "vitest";

import { formatDayMonth, formatMonthHeading, formatVisibleUntil } from "./announcement-dates";

describe("announcement dates", () => {
  it("writes the visible-until business date with its weekday", () => {
    expect(formatVisibleUntil("2026-10-30")).toBe("viernes 30 de octubre");
    expect(formatVisibleUntil("2026-11-02")).toBe("lunes 2 de noviembre");
  });

  it("writes an instant as day/month in Montevideo", () => {
    expect(formatDayMonth("2026-10-27T15:00:00.000Z")).toBe("27/10");
    expect(formatDayMonth("2026-10-28T01:30:00.000Z")).toBe("27/10");
  });

  it("writes the heading of a month group", () => {
    expect(formatMonthHeading("2026-10")).toBe("OCTUBRE 2026");
    expect(formatMonthHeading("2026-09")).toBe("SEPTIEMBRE 2026");
  });
});
