import type { BirthdaysTodayDto, TodaySummaryDto, ToCollectTodayDto } from "@/lib/api/types";

import { failure, type FakeResponse } from "./fake-checkout";
import { answerStats, type StatsKind } from "./fake-dashboard-stats";
import { businessDateFromToday, STAFF_BOOKING_CLIENT_IDS, STAFF_SETTINGS } from "./offline-charges-fixtures";
import { type DashboardScenario, isStaffScenario } from "./scenarios";

const API_PREFIX = "/api/v1";
const DASHBOARD_PREFIX = `${API_PREFIX}/staff/dashboard/`;

// `staff-dashboard` is a busy day: everything pending, a birthday, charges to collect (one without a price, one
// without a client). `staff-dashboard-empty` is a day with nothing to do. `staff-dashboard-collect-down` is the
// busy day with only "Cobrar hoy" failing, and `staff-dashboard-money-down` the busy day with only the Plata stats
// failing. `staff-dashboard-money-currency` is the same day with Plata answering 409 (an amount in another currency). Any other staff scenario gets a quiet day (see `quietDay`). The Negocio stats are in fake-dashboard-stats.ts.
export const DASHBOARD_SCENARIOS: readonly string[] = [
  "staff-dashboard",
  "staff-dashboard-empty",
  "staff-dashboard-collect-down",
  "staff-dashboard-money-down",
  "staff-dashboard-money-currency",
] satisfies DashboardScenario[];

const SCENARIO_BUSY = "staff-dashboard";
const SCENARIO_COLLECT_DOWN = "staff-dashboard-collect-down";
const SCENARIO_MONEY_DOWN = "staff-dashboard-money-down";
const SCENARIO_MONEY_CURRENCY = "staff-dashboard-money-currency";
const SCENARIO_EMPTY = "staff-dashboard-empty";
const STATS_PREFIX = "stats/";
const SCENARIO_PREFIX_BOOKING = "staff-booking";

const INTERNAL = failure(500, "INTERNAL", "Error interno.");

// A time of day in Montevideo (UTC-3, no daylight saving) today, as the instant the API sends. Before 21:00.
function todayAt(hour: number, minute = 0): string {
  return `${businessDateFromToday(0)}T${String(hour + 3).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00.000Z`;
}

const EMPTY_SUMMARY: TodaySummaryDto = {
  bookingsToday: { bookings: 0, slots: 0 },
  attendanceUnmarked: { bookings: 0, slots: 0 },
  paymentsToReview: { purchases: 0 },
  expiringSoon: { clients: 0, endingTomorrow: 0, windowDays: 10 },
  overdueCharges: { charges: 0, total: 0, withoutAmount: 0 },
  clientsAtRisk: { clients: 0, urgent: 0 },
};

const BUSY_SUMMARY: TodaySummaryDto = {
  bookingsToday: { bookings: 14, slots: 6 },
  attendanceUnmarked: { bookings: 6, slots: 2 },
  paymentsToReview: { purchases: 2 },
  expiringSoon: { clients: 4, endingTomorrow: 1, windowDays: 10 },
  overdueCharges: { charges: 3, total: 4500, withoutAmount: 1 },
  clientsAtRisk: { clients: 23, urgent: 7 },
};

const BUSY_COLLECT: ToCollectTodayDto = {
  items: [
    {
      chargeId: "dash-ch-lucia",
      client: { id: "dash-c-lucia", name: "Lucía Castro", initials: "LC" },
      service: "rehab",
      startsAt: todayAt(9),
      amount: 1200,
      hasAttended: true,
      paysWith: null,
    },
    {
      chargeId: "dash-ch-martin",
      client: { id: "dash-c-martin", name: "Martín Rodríguez", initials: "MR" },
      service: "performance",
      startsAt: todayAt(11, 30),
      amount: 450,
      hasAttended: false,
      paysWith: null,
    },
    {
      chargeId: "dash-ch-sofia",
      client: { id: "dash-c-sofia", name: "Sofía Fernández", initials: "SF" },
      service: "recovery",
      startsAt: todayAt(17, 30),
      amount: null,
      hasAttended: false,
      paysWith: null,
    },
    {
      chargeId: "dash-ch-diego",
      client: { id: "dash-c-diego", name: "Diego González", initials: "DG" },
      service: "rehab",
      startsAt: todayAt(19),
      amount: 1200,
      hasAttended: false,
      paysWith: null,
    },
    {
      chargeId: "dash-ch-nobody",
      client: null,
      service: "recovery",
      startsAt: todayAt(20),
      amount: 600.5,
      hasAttended: false,
      paysWith: null,
    },
  ],
  total: 3450.5,
  withoutAmount: 1,
  // Four clients and a charge with no client to show.
  clients: 4,
};

const BUSY_BIRTHDAYS: BirthdaysTodayDto = {
  message: "Gracias por entrenar con nosotros: que este nuevo año venga con muchos objetivos cumplidos.",
  whatsappEnabled: true,
  items: [
    {
      clientId: "dash-c-martina",
      name: "Martina",
      lastName: "Pérez",
      phone: "+59899123456",
      age: 29,
      whatsappOpenedAt: null,
      booking: { service: "performance", startsAt: todayAt(18) },
    },
  ],
};

// The seeded charges of `staff-booking*` (fake-offline-charges.ts): Ana's is today at 10:00, Juan's (no price)
// was yesterday. The dashboard has to tell the same story as Pagos > Por cobrar.
function bookingDay(): { summary: TodaySummaryDto; collect: ToCollectTodayDto } {
  // The price is set in the seeded settings; a missing one would be a charge without a price.
  const price = STAFF_SETTINGS.offlinePricePerformanceClass ?? null;
  return {
    summary: {
      ...EMPTY_SUMMARY,
      // Ana's booking is today at 10:00: once it started, its attendance is still to mark.
      bookingsToday: { bookings: 1, slots: 1 },
      attendanceUnmarked: Date.parse(todayAt(10)) <= Date.now() ? { bookings: 1, slots: 1 } : { bookings: 0, slots: 0 },
      overdueCharges: { charges: 1, total: 0, withoutAmount: 1 },
    },
    collect: {
      items: [
        {
          chargeId: "charge-ana-performance",
          client: { id: STAFF_BOOKING_CLIENT_IDS.ana, name: "Ana Díaz", initials: "AD" },
          service: "performance",
          startsAt: todayAt(10),
          amount: price,
          hasAttended: false,
          paysWith: null,
        },
      ],
      total: price ?? 0,
      withoutAmount: price === null ? 1 : 0,
      clients: 1,
    },
  };
}

function quietDay(): { summary: TodaySummaryDto; collect: ToCollectTodayDto } {
  return { summary: EMPTY_SUMMARY, collect: { items: [], total: 0, withoutAmount: 0, clients: 0 } };
}

// The staff dashboard: Hoy and the three Negocio tabs. It answers every staff scenario, so `/staff` never shows
// errors in the others.
export function createDashboardStore(): {
  handle(method: string, url: URL, scenario: string | null): Promise<FakeResponse | null>;
} {
  return {
    async handle(method, url, scenario) {
      if (method !== "GET" || !url.pathname.startsWith(DASHBOARD_PREFIX) || !isStaffScenario(scenario)) return null;
      const route = url.pathname.slice(DASHBOARD_PREFIX.length);
      const busy =
        scenario === SCENARIO_BUSY ||
        scenario === SCENARIO_COLLECT_DOWN ||
        scenario === SCENARIO_MONEY_DOWN ||
        scenario === SCENARIO_MONEY_CURRENCY;
      const day = scenario?.startsWith(SCENARIO_PREFIX_BOOKING) ? bookingDay() : quietDay();

      if (route === "today") return { status: 200, body: busy ? BUSY_SUMMARY : day.summary };
      if (route === "to-collect-today") {
        if (scenario === SCENARIO_COLLECT_DOWN) return INTERNAL;
        return { status: 200, body: busy ? BUSY_COLLECT : day.collect };
      }
      if (route === "birthdays-today") {
        const empty: BirthdaysTodayDto = { message: BUSY_BIRTHDAYS.message, whatsappEnabled: true, items: [] };
        return { status: 200, body: busy ? BUSY_BIRTHDAYS : empty };
      }
      if (route.startsWith(STATS_PREFIX)) {
        const kind = route.slice(STATS_PREFIX.length);
        if (kind !== "money" && kind !== "slots" && kind !== "clients") return null;
        if (kind === "money" && scenario === SCENARIO_MONEY_CURRENCY) {
          return failure(409, "DASHBOARD_UNSUPPORTED_CURRENCY", "Hay montos en una moneda distinta a UYU.");
        }
        return answerStats(kind satisfies StatsKind, url, {
          empty: scenario === SCENARIO_EMPTY,
          down: kind === "money" && scenario === SCENARIO_MONEY_DOWN,
        });
      }
      return null;
    },
  };
}
