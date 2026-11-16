import { describe, expect, it } from "vitest";

import type { MyAttendanceItemDto, MyAttendancePageDto } from "@/lib/api/types";

import { ATTENDANCE_STATE_BADGE, groupAttendanceByMonth, monthLabel } from "./present-attendance";

const TODAY = "2026-11-02";

const item = (startsAt: string, over: Partial<MyAttendanceItemDto> = {}): MyAttendanceItemDto => ({
  bookingId: `booking-${startsAt}`,
  service: "performance",
  startsAt,
  endsAt: startsAt,
  label: "Entrenamiento semi personalizado",
  state: "present",
  ...over,
});

const page = (items: MyAttendanceItemDto[], months: MyAttendancePageDto["months"]): MyAttendancePageDto => ({
  items,
  total: items.length,
  page: 1,
  pageSize: 20,
  months,
});

describe("ATTENDANCE_STATE_BADGE", () => {
  it("names and colors every state the way the staff sees it", () => {
    expect(ATTENDANCE_STATE_BADGE).toEqual({
      present: { label: "Presente", tone: "success" },
      absent: { label: "Ausente", tone: "neutral" },
      unmarked: { label: "Sin marcar", tone: "warning" },
      cancelled: { label: "Cancelada", tone: "neutral" },
    });
  });
});

describe("monthLabel", () => {
  it("writes the Spanish month name of a YYYY-MM key", () => {
    expect(monthLabel("2026-10")).toBe("octubre");
    expect(monthLabel("2026-01")).toBe("enero");
  });
});

describe("groupAttendanceByMonth", () => {
  it("groups rows by Montevideo month, in the order the API sent them", () => {
    const groups = groupAttendanceByMonth(
      page(
        [item("2026-11-01T15:00:00Z"), item("2026-11-01T01:30:00Z"), item("2026-10-20T21:00:00Z")],
        [
          { month: "2026-11", attended: 1 },
          { month: "2026-10", attended: 8 },
        ],
      ),
      TODAY,
    );

    // 01:30 UTC on 1 Nov is still 31 Oct, 22:30 in Montevideo.
    expect(groups.map((group) => [group.monthKey, group.rows.length])).toEqual([
      ["2026-11", 1],
      ["2026-10", 2],
    ]);
    expect(groups.map((group) => group.heading)).toEqual(["NOVIEMBRE 2026", "OCTUBRE 2026"]);
  });

  it("takes the attended count from the API, not from the rows on this page", () => {
    const [group] = groupAttendanceByMonth(page([item("2026-10-20T21:00:00Z")], [{ month: "2026-10", attended: 8 }]), TODAY);

    expect(group.attendedLabel).toBe("8 asistencias");
  });

  it("uses the singular for one and 0 for a month the API did not report", () => {
    const [single] = groupAttendanceByMonth(page([item("2026-10-20T21:00:00Z")], [{ month: "2026-10", attended: 1 }]), TODAY);
    const [none] = groupAttendanceByMonth(page([item("2026-10-20T21:00:00Z")], []), TODAY);

    expect(single.attendedLabel).toBe("1 asistencia");
    expect(none.attendedLabel).toBe("0 asistencias");
  });

  it("titles a row with the service and the Montevideo time, and carries the day box and the state", () => {
    const [group] = groupAttendanceByMonth(
      page(
        [
          item("2026-10-26T21:00:00Z", { state: "absent" }),
          item("2026-10-24T13:30:00Z", { service: "rehab", label: "Seguimiento fisioterapéutico · 60 min" }),
        ],
        [{ month: "2026-10", attended: 1 }],
      ),
      TODAY,
    );

    expect(group.rows[0]).toMatchObject({
      title: "Performance — 18:00",
      description: "Entrenamiento semi personalizado",
      dow: "LUN",
      dayNumber: 26,
      state: "absent",
    });
    expect(group.rows[1]).toMatchObject({
      title: "Fisioterapia — 10:30",
      description: "Seguimiento fisioterapéutico · 60 min",
      dow: "SÁB",
      dayNumber: 24,
    });
  });
});
