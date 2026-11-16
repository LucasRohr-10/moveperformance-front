import { describe, expect, it } from "vitest";

import { formatInstantDate, formatInstantDateTime } from "./followup-dates";

describe("follow-up dates", () => {
  it("writes an instant as the business date in Montevideo", () => {
    expect(formatInstantDate("2026-09-24T12:00:00.000Z")).toBe("24/09/2026");
  });

  it("keeps the day of Montevideo when it is already the next day in UTC", () => {
    expect(formatInstantDate("2026-09-25T01:30:00.000Z")).toBe("24/09/2026");
  });

  it("adds the hour of Montevideo", () => {
    expect(formatInstantDateTime("2026-10-12T13:05:00.000Z")).toBe("12/10/2026 10:05");
  });
});
