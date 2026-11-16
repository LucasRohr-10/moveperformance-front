import { describe, expect, it } from "vitest";

import type { BookingResponse } from "@/lib/api/types";

import {
  bookingCountLabel,
  browsableMonths,
  monthName,
  monthTitle,
  rowsForMonth,
  shortWhen,
  toUpcomingRows,
} from "./present-upcoming-bookings";

const TODAY = "2026-10-23";

function booking(overrides: Partial<BookingResponse>): BookingResponse {
  return {
    id: "b1",
    timeSlotId: "s1",
    service: "recovery",
    startsAt: "2026-10-24T13:30:00Z",
    endsAt: "2026-10-24T14:15:00Z",
    durationMinutes: 45,
    label: "Sesión Recovery · 45 min",
    status: "confirmed",
    source: "plan",
    canCancel: true,
    cancelledAt: null,
    ...overrides,
  };
}

describe("toUpcomingRows", () => {
  it("turns a booking into the data a row shows, in the business time zone", () => {
    const [row] = toUpcomingRows([booking({})], TODAY);

    expect(row).toMatchObject({
      id: "b1",
      service: "recovery",
      serviceLabel: "Recovery",
      title: "Sesión Recovery · 45 min",
      monthKey: "2026-10",
      time: "10:30",
      durationMinutes: 45,
      isPendingPayment: false,
      canCancel: true,
    });
    expect(row.day).toMatchObject({ dow: "SÁB", dayNumber: 24, month: "OCT", isToday: false });
    expect(shortWhen(row)).toBe("Sáb 24 Oct · 10:30");
  });

  it("marks today's booking and the ones waiting for payment", () => {
    const rows = toUpcomingRows(
      [
        booking({ id: "today", startsAt: "2026-10-23T21:00:00Z" }),
        booking({ id: "pending", status: "pending_payment", canCancel: false }),
      ],
      TODAY,
    );

    expect(rows[0].day.isToday).toBe(true);
    expect(rows[1]).toMatchObject({ isPendingPayment: true, canCancel: false });
  });

  it("places a booking after 21:00 UTC-3 in the business day, not the UTC day", () => {
    const [row] = toUpcomingRows([booking({ startsAt: "2026-11-01T02:00:00Z" })], TODAY);

    expect(row.monthKey).toBe("2026-10");
    expect(row.day.dayNumber).toBe(31);
  });
});

describe("browsableMonths", () => {
  const rowsIn = (...starts: string[]) =>
    toUpcomingRows(
      starts.map((startsAt, index) => booking({ id: `b${index}`, startsAt })),
      TODAY,
    );

  it("goes from the month of the first booking to the month of the last one", () => {
    const rows = rowsIn("2026-10-24T13:30:00Z", "2026-12-02T13:30:00Z");

    expect(browsableMonths(rows, "2026-10")).toEqual(["2026-10", "2026-11", "2026-12"]);
  });

  it("starts in the month of the first booking even when it is after the current month", () => {
    const rows = rowsIn("2026-11-03T13:30:00Z");

    expect(browsableMonths(rows, "2026-10")).toEqual(["2026-11"]);
  });

  it("falls back to the current month when there are no bookings", () => {
    expect(browsableMonths([], "2026-10")).toEqual(["2026-10"]);
  });
});

describe("rowsForMonth", () => {
  const rows = toUpcomingRows(
    [
      booking({ id: "oct-rec", startsAt: "2026-10-24T13:30:00Z", service: "recovery" }),
      booking({ id: "oct-perf", startsAt: "2026-10-26T10:00:00Z", service: "performance" }),
      booking({ id: "nov-rec", startsAt: "2026-11-04T22:00:00Z", service: "recovery" }),
    ],
    TODAY,
  );

  it("keeps only the bookings of that month, in the order they come", () => {
    expect(rowsForMonth(rows, "2026-10", "all").map((row) => row.id)).toEqual(["oct-rec", "oct-perf"]);
  });

  it("narrows to one service when asked", () => {
    expect(rowsForMonth(rows, "2026-10", "performance").map((row) => row.id)).toEqual(["oct-perf"]);
  });
});

describe("labels", () => {
  it("names the month with its year and without it", () => {
    expect(monthTitle("2026-11")).toBe("Noviembre 2026");
    expect(monthName("2026-11")).toBe("noviembre");
  });

  it("counts bookings in singular and plural", () => {
    expect(bookingCountLabel(1)).toBe("1 reserva");
    expect(bookingCountLabel(0)).toBe("0 reservas");
    expect(bookingCountLabel(3)).toBe("3 reservas");
  });
});
