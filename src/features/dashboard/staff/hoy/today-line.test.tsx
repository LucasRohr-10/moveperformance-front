import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api/errors";

import { getTodaySummary } from "./get-today-summary";
import { nextRedirectError, SUMMARY } from "./today-fixtures";
import { TodayLine } from "./today-line";

vi.mock("./get-today-summary");

const getTodaySummaryMock = vi.mocked(getTodaySummary);

describe("TodayLine", () => {
  beforeEach(() => {
    getTodaySummaryMock.mockReset();
  });

  it("puts the number of bookings in bold, like the mockup", async () => {
    getTodaySummaryMock.mockResolvedValue(SUMMARY);

    const { container } = render(await TodayLine());

    expect(container.textContent).toBe("Hoy hay 14 reservas en 6 turnos.");
    expect(screen.getByText("14 reservas").tagName).toBe("B");
  });

  it("says it in singular and keeps the bold on the bookings", async () => {
    getTodaySummaryMock.mockResolvedValue({ ...SUMMARY, bookingsToday: { bookings: 1, slots: 1 } });

    const { container } = render(await TodayLine());

    expect(container.textContent).toBe("Hoy hay 1 reserva en 1 turno.");
    expect(screen.getByText("1 reserva").tagName).toBe("B");
  });

  it("says there are no bookings, with nothing in bold", async () => {
    getTodaySummaryMock.mockResolvedValue({ ...SUMMARY, bookingsToday: { bookings: 0, slots: 0 } });

    const { container } = render(await TodayLine());

    expect(container.textContent).toBe("Hoy no hay reservas.");
    expect(container.querySelector("b")).toBeNull();
  });

  it("is left out when the API fails", async () => {
    getTodaySummaryMock.mockRejectedValue(new ApiError({ statusCode: 500, code: "INTERNAL", message: "x" }));

    expect(await TodayLine()).toBeNull();
  });

  it("lets a Next error such as a redirect through instead of swallowing it", async () => {
    const redirectError = nextRedirectError();
    getTodaySummaryMock.mockRejectedValue(redirectError);

    await expect(TodayLine()).rejects.toBe(redirectError);
  });
});
