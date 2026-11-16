import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { TodaySummaryDto } from "@/lib/api/types";

import { SUMMARY } from "./today-fixtures";
import { countPending, HOY_TILES } from "./hoy-tiles";

const lineOf = (key: string, summary: TodaySummaryDto): HTMLElement => {
  const def = HOY_TILES.find((tile) => tile.key === key);
  if (!def) throw new Error(`no tile ${key}`);
  const { container } = render(<p>{def.value(summary) === 0 ? def.zeroNote(summary) : def.note(summary)}</p>);
  return container;
};

describe("HOY_TILES", () => {
  it("expiring: warns about tomorrow's expiries and counts clients", () => {
    expect(lineOf("expiring", SUMMARY).textContent).toBe("1 vence mañana · 4 clientes");
  });

  it("expiring: names the window when nobody expires", () => {
    const summary = { ...SUMMARY, expiringSoon: { clients: 0, endingTomorrow: 0, windowDays: 10 } };
    expect(lineOf("expiring", summary).textContent).toBe("Nadie vence en los próximos 10 días ✓");
  });

  it("expiring: the text behind the i uses the window the API sends", () => {
    const def = HOY_TILES.find((tile) => tile.key === "expiring");
    if (!def) throw new Error("no tile expiring");

    const seven = { ...SUMMARY, expiringSoon: { ...SUMMARY.expiringSoon, windowDays: 7 } };
    expect(def.info(seven)).toContain("en los próximos 7 días");
    expect(def.info(seven)).not.toContain("10 días");
    expect(def.info(SUMMARY)).toContain("en los próximos 10 días");
  });

  it("overdue: shows the exact total and the charges without a price", () => {
    expect(lineOf("overdue", { ...SUMMARY, overdueCharges: { charges: 3, total: 4500.5, withoutAmount: 1 } }).textContent).toBe(
      "$ 4.500,50 de días anteriores · 1 sin precio",
    );
    expect(lineOf("overdue", SUMMARY).textContent).toContain("$ 4.500 de días anteriores · 1 sin precio");
    expect(
      lineOf("overdue", { ...SUMMARY, overdueCharges: { charges: 2, total: 2400, withoutAmount: 0 } }).textContent,
    ).toBe("$ 2.400 de días anteriores");
  });

  it("overdue: with no price at all, does not say $ 0", () => {
    const summary = { ...SUMMARY, overdueCharges: { charges: 2, total: 0, withoutAmount: 2 } };
    expect(lineOf("overdue", summary).textContent).toBe("2 sin precio · de días anteriores");
  });

  it("risk: shows the urgent ones in danger", () => {
    render(<>{HOY_TILES.find((tile) => tile.key === "risk")?.note(SUMMARY)}</>);
    expect(screen.getByText("7 urgentes").className).toContain("text-danger");
  });
});

describe("countPending", () => {
  it("counts the tiles that ask for something, plus the birthday", () => {
    expect(countPending(SUMMARY, false)).toBe(3);
    expect(countPending(SUMMARY, true)).toBe(4);
  });

  it("does not count expiring or at-risk clients", () => {
    const summary: TodaySummaryDto = {
      ...SUMMARY,
      attendanceUnmarked: { bookings: 0, slots: 0 },
      paymentsToReview: { purchases: 0 },
      overdueCharges: { charges: 0, total: 0, withoutAmount: 0 },
    };
    expect(countPending(summary, false)).toBe(0);
  });
});
