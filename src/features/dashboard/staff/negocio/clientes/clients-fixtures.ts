import type { ClientsStatsDto } from "@/lib/api/types";

// Shared by the Clientes tests: October 2026 against September.
export const CLIENTS_STATS: ClientsStatsDto = {
  meta: {
    period: { from: "2026-10-01", to: "2026-10-31", inProgress: false },
    comparison: { from: "2026-09-01", to: "2026-09-30", inProgress: false, hasData: true },
    dataSince: "2026-03-12",
    granularity: "week",
    granularityOptions: ["day", "week", "month"],
  },
  active: { current: 84, previous: 79, change: 6, changeUnit: "percent" },
  joins: { current: 9, previous: 7, change: 29, changeUnit: "percent" },
  leaves: { current: 4, previous: 3, change: 33, changeUnit: "percent", pending: 5 },
  staffLeaves: { current: 1, previous: 2, change: -50, changeUnit: "percent" },
  paused: { current: 17, previous: 16, change: 6, changeUnit: "percent" },
  renewal: { current: 0.68, previous: 0.65, change: 3, changeUnit: "points", renewed: 17, due: 25, pending: 4 },
  series: [
    { from: "2026-10-01", to: "2026-10-04", inProgress: false, active: 80, previousActive: 76, joins: 2, leaves: 1, leavesPending: 0 },
    { from: "2026-10-05", to: "2026-10-11", inProgress: false, active: 81, previousActive: 77, joins: 3, leaves: 2, leavesPending: 0 },
    { from: "2026-10-12", to: "2026-10-18", inProgress: false, active: 83, previousActive: 78, joins: 2, leaves: 0, leavesPending: 2 },
    { from: "2026-10-19", to: "2026-10-31", inProgress: false, active: 84, previousActive: 79, joins: 2, leaves: 1, leavesPending: 3 },
  ],
  renewalByService: [
    { service: "performance", renewed: 11, due: 14, rate: 0.79 },
    { service: "recovery", renewed: 6, due: 11, rate: 0.55 },
  ],
  pauseReasons: [
    { reason: "injury", count: 5 },
    { reason: "vacation", count: 4 },
    { reason: "no_time", count: 3 },
    { reason: "moving", count: 1 },
  ],
};
