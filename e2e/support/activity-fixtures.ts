import type { ActivitySummaryDto, AttendanceHistoryState, MyAttendanceItemDto } from "@/lib/api/types";

export const E2E_ACTIVITY_SUMMARY: ActivitySummaryDto = {
  month: "2026-10",
  monthAttendances: 8,
  frequencyPerWeek: 2.3,
  streak: 3,
  hasAttended: true,
};

// A client who never attended, and what any other signed-in client gets so their profile loads.
export const EMPTY_ACTIVITY_SUMMARY: ActivitySummaryDto = {
  month: "2026-10",
  monthAttendances: 0,
  frequencyPerWeek: 0,
  streak: 0,
  hasAttended: false,
};

function item(bookingId: string, startsAt: string, state: AttendanceHistoryState): MyAttendanceItemDto {
  return {
    bookingId,
    service: "performance",
    startsAt,
    endsAt: startsAt,
    label: "Entrenamiento semi personalizado",
    state,
  };
}

const OCTOBER: MyAttendanceItemDto[] = [
  item("att-present", "2026-10-26T21:00:00.000Z", "present"),
  item("att-unmarked", "2026-10-23T21:00:00.000Z", "unmarked"),
  item("att-absent", "2026-10-22T21:00:00.000Z", "absent"),
  item("att-cancelled", "2026-10-14T21:00:00.000Z", "cancelled"),
];

// Twenty more presents in September, so the history needs a second page (20 per page) and a month spans both.
const SEPTEMBER: MyAttendanceItemDto[] = Array.from({ length: 20 }, (_, index) =>
  item(`att-sep-${index + 1}`, `2026-09-${String(30 - index).padStart(2, "0")}T21:00:00.000Z`, "present"),
);

// Newest first, the order the API answers.
export const E2E_ATTENDANCE: MyAttendanceItemDto[] = [...OCTOBER, ...SEPTEMBER];
