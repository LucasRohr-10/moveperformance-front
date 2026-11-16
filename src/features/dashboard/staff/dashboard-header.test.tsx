import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DashboardHeader } from "./dashboard-header";

describe("DashboardHeader", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("writes the date as weekday, day and month with no comma, and greets by name", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-03T15:00:00.000Z"));

    render(<DashboardHeader userName="Valentina" />);

    expect(screen.getByText("martes 3 de noviembre")).toBeDefined();
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Hola, Valentina.");
  });

  it("uses the date in Montevideo, not in UTC", () => {
    vi.useFakeTimers();
    // 02:00Z on the 4th is 23:00 on the 3rd in Montevideo (UTC-3).
    vi.setSystemTime(new Date("2026-11-04T02:00:00.000Z"));

    render(<DashboardHeader userName="Lucía" />);

    expect(screen.getByText("martes 3 de noviembre")).toBeDefined();
  });
});
