import { describe, expect, it } from "vitest";

import { formatInboxDate } from "./format-inbox-date";

const NOW = new Date("2026-10-27T15:00:00Z");

describe("formatInboxDate", () => {
  it("today", () => {
    expect(formatInboxDate("2026-10-27T13:42:00Z", NOW)).toBe("Hoy · 10:42");
  });

  it("yesterday across midnight in Montevideo", () => {
    expect(formatInboxDate("2026-10-27T02:30:00Z", NOW)).toBe("Ayer · 23:30");
  });

  it("older date", () => {
    expect(formatInboxDate("2026-10-20T15:00:00Z", NOW)).toBe("20 oct");
  });

  it("a date late in the evening UTC still belongs to the Montevideo day", () => {
    expect(formatInboxDate("2026-10-28T01:30:00Z", new Date("2026-10-28T12:00:00Z"))).toBe("Ayer · 22:30");
  });
});
