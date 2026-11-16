import type { MoneyStatsDto } from "@/lib/api/types";

// Shared by the Plata tests: October 2026 against September, with refunds.
export const MONEY_STATS: MoneyStatsDto = {
  meta: {
    period: { from: "2026-10-01", to: "2026-10-31", inProgress: false },
    comparison: { from: "2026-09-01", to: "2026-09-30", inProgress: false, hasData: true },
    dataSince: "2026-03-12",
    granularity: "week",
    granularityOptions: ["day", "week", "month"],
  },
  collected: { current: 120000, previous: 100000, change: 20, changeUnit: "percent" },
  refunds: { current: 3500, previous: 0, change: null, changeUnit: "percent" },
  perDay: { current: 3871, previous: 3333, change: 16, changeUnit: "percent" },
  perActiveClient: { current: 2400, previous: 2500, change: -4, changeUnit: "percent" },
  byService: [
    { service: "performance", amount: 72000, previousAmount: 60000, share: 0.6, change: 20 },
    { service: "rehab", amount: 36000, previousAmount: 30000, share: 0.3, change: 20 },
    { service: "recovery", amount: 12000, previousAmount: 10000, share: 0.1, change: 20 },
  ],
  byMethod: [
    { method: "mercado_pago", amount: 90000, previousAmount: 80000, share: 0.75, change: 13 },
    { method: "cash", amount: 24000, previousAmount: 15000, share: 0.2, change: 60 },
    { method: "transfer", amount: 6000, previousAmount: 5000, share: 0.05, change: 20 },
  ],
  series: [
    { from: "2026-10-01", to: "2026-10-04", inProgress: false, byService: { performance: 18000, rehab: 9000, recovery: 3000 }, total: 30000, previousTotal: 25000 },
    { from: "2026-10-05", to: "2026-10-11", inProgress: false, byService: { performance: 18000, rehab: 9000, recovery: 3000 }, total: 30000, previousTotal: 25000 },
    { from: "2026-10-12", to: "2026-10-18", inProgress: false, byService: { performance: 18000, rehab: 9000, recovery: 3000 }, total: 30000, previousTotal: 25000 },
    { from: "2026-10-19", to: "2026-10-31", inProgress: false, byService: { performance: 18000, rehab: 9000, recovery: 3000 }, total: 30000, previousTotal: 25000 },
  ],
  approvedNotApplied: 0,
};
