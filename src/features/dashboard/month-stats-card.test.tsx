import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api/errors";
import type { ActivitySummaryDto } from "@/lib/api/types";

import { getMyActivitySummary } from "./get-my-activity-summary";
import { MonthStatsCard, MonthStatsSkeleton, MonthStatsView } from "./month-stats-card";

vi.mock("./get-my-activity-summary");

const getMock = vi.mocked(getMyActivitySummary);

const summary = (over: Partial<ActivitySummaryDto> = {}): ActivitySummaryDto => ({
  month: "2026-10",
  monthAttendances: 8,
  frequencyPerWeek: 2.3,
  streak: 3,
  hasAttended: true,
  ...over,
});

describe("MonthStatsView", () => {
  it("shows the month's attendances, the weekly average and the streak, with a link to the activity page", () => {
    render(<MonthStatsView summary={summary()} />);

    expect(screen.getByText("Tu mes en MOVE")).toBeDefined();
    expect(screen.getByText("Octubre")).toBeDefined();
    expect(screen.getByText("8")).toBeDefined();
    expect(screen.getByText("Asistencias")).toBeDefined();
    expect(screen.getByText("2.3")).toBeDefined();
    expect(screen.getByText("Veces/semana")).toBeDefined();
    expect(screen.getByText("3")).toBeDefined();
    expect(screen.getByText("Racha")).toBeDefined();
    expect(screen.getByRole("link", { name: /Ver mi actividad/ }).getAttribute("href")).toBe("/history");
  });

  it("lets 'Veces/semana' wrap after the slash and keeps every label inside its tile", () => {
    const { container } = render(<MonthStatsView summary={summary()} />);

    expect(container.querySelector("wbr")?.previousSibling?.textContent).toBe("Veces/");
    const label = screen.getByText("Asistencias");
    expect(label.className).toContain("text-[11px]");
    expect(label.className).toContain("[overflow-wrap:anywhere]");
    expect(label.closest("div")?.className).toContain("px-1");
  });

  it("always writes the weekly average with one decimal", () => {
    render(<MonthStatsView summary={summary({ frequencyPerWeek: 2 })} />);

    expect(screen.getByText("2.0")).toBeDefined();
  });

  it("highlights a streak in yellow and leaves a zero streak gray", () => {
    const { unmount } = render(<MonthStatsView summary={summary({ streak: 3 })} />);
    expect(screen.getByText("Racha").closest("div")?.className).toContain("border-warning");
    unmount();

    render(<MonthStatsView summary={summary({ streak: 0 })} />);
    expect(screen.getByText("Racha").closest("div")?.className).not.toContain("border-warning");
  });

  it("invites a client who never attended to book, and offers no activity link yet", () => {
    render(<MonthStatsView summary={summary({ hasAttended: false, monthAttendances: 0, frequencyPerWeek: 0, streak: 0 })} />);

    expect(screen.getByText("Acá vas a ver tu racha")).toBeDefined();
    expect(
      screen.getByText("Cuando vengas a tu primer turno, empezamos a contar tus asistencias y tus veces por semana."),
    ).toBeDefined();
    expect(screen.getByRole("link", { name: "Reservar" }).getAttribute("href")).toBe("/bookings");
    expect(screen.queryByRole("link", { name: /Ver mi actividad/ })).toBeNull();
    expect(screen.getByRole("link", { name: "Reservar" }).className).toContain("min-h-11");
  });

  it("keeps the numbers for a client who attended before but not yet this month", () => {
    render(<MonthStatsView summary={summary({ monthAttendances: 0, streak: 4 })} />);

    expect(screen.queryByText("Acá vas a ver tu racha")).toBeNull();
    expect(screen.getByText("Racha")).toBeDefined();
    expect(screen.getByText("4")).toBeDefined();
  });
});

describe("MonthStatsCard", () => {
  beforeEach(() => {
    getMock.mockReset();
  });

  it("loads the client's own summary and shows it", async () => {
    getMock.mockResolvedValue(summary());

    render(await MonthStatsCard());

    expect(screen.getByText("Asistencias")).toBeDefined();
  });

  it("keeps the card and says the numbers could not be loaded when the API fails", async () => {
    getMock.mockRejectedValue(new ApiError({ statusCode: 500, code: "INTERNAL", message: "x" }));

    render(await MonthStatsCard());

    expect(screen.getByText("Tu mes en MOVE")).toBeDefined();
    expect(screen.getByText("No pudimos cargar tus números.")).toBeDefined();
  });
});

describe("MonthStatsSkeleton", () => {
  it("keeps the title and marks itself busy", () => {
    render(<MonthStatsSkeleton />);

    expect(screen.getByText("Tu mes en MOVE")).toBeDefined();
    expect(document.querySelector("[aria-busy='true']")).not.toBeNull();
  });
});
