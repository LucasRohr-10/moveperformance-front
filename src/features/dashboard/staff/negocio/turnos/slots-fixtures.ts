import type { SlotsStatsDto } from "@/lib/api/types";

// Shared by the Turnos tests: October 2026 against September.
export const SLOTS_STATS: SlotsStatsDto = {
  meta: {
    period: { from: "2026-10-01", to: "2026-10-31", inProgress: false },
    comparison: { from: "2026-09-01", to: "2026-09-30", inProgress: false, hasData: true },
    dataSince: "2026-03-12",
    granularity: "week",
    granularityOptions: ["day", "week", "month"],
  },
  occupancy: { current: 0.74, previous: 0.75, change: -1, changeUnit: "points", booked: 280, offered: 380 },
  attendance: { current: 0.9, previous: 0.89, change: 1, changeUnit: "points" },
  cancellations: { current: 23, previous: 27, change: -15, changeUnit: "percent" },
  sameDayCancellations: 8,
  seats: [
    { service: "performance", offered: 200, booked: 150, occupancy: 0.75, attended: 120, notAttended: 12, unmarked: 6, upcoming: 0, free: 62 },
    { service: "rehab", offered: 100, booked: 75, occupancy: 0.75, attended: 60, notAttended: 10, unmarked: 0, upcoming: 0, free: 30 },
    { service: "recovery", offered: 80, booked: 55, occupancy: 0.69, attended: 40, notAttended: 5, unmarked: 3, upcoming: 0, free: 32 },
  ],
  cancellationsByReason: [
    { reason: "client", count: 15, sameDay: 6 },
    { reason: "staff", count: 4, sameDay: 1 },
    { reason: "studio_closed", count: 2, sameDay: 0 },
    { reason: "deactivation", count: 1, sameDay: 0 },
    { reason: "staff_unknown", count: 1, sameDay: 1 },
  ],
  busyHours: [
    { hour: 8, byService: { performance: 30, rehab: 10, recovery: 0 }, total: 40 },
    { hour: 9, byService: { performance: 25, rehab: 12, recovery: 4 }, total: 41 },
    { hour: 18, byService: { performance: 40, rehab: 20, recovery: 10 }, total: 70 },
  ],
  heatmap: [
    { isoWeekday: 1, hour: 8, offered: 8, booked: 6, rate: 0.75 },
    { isoWeekday: 1, hour: 9, offered: 8, booked: 0, rate: 0 },
    { isoWeekday: 1, hour: 18, offered: 10, booked: 10, rate: 1 },
    { isoWeekday: 3, hour: 8, offered: 8, booked: 4, rate: 0.5 },
    { isoWeekday: 3, hour: 18, offered: 0, booked: 0, rate: null },
  ],
};
