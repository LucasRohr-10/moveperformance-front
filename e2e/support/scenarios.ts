import type {
  AuthenticatedUser,
  MySubscriptionsDto,
  PerformanceSubscriptionDto,
  RecoveryPackDto,
} from "@/lib/api/types";

export const SCENARIO_COOKIE = "move-e2e-scenario";
// Which client is asking. Only the debits are kept per client, so tests running in parallel do not see each other's.
export const OWNER_COOKIE = "move-e2e-owner";
export const DEFAULT_OWNER = "shared";
export const SLOW_RESPONSE_MS = 2000;

export const E2E_CLIENT: AuthenticatedUser = {
  id: "e2e-client-ana",
  name: "Ana",
  lastName: "Pérez",
  email: "ana@move.test",
  phone: "+59899123456",
  birthDate: "1990-03-12",
  role: "client",
};

export const E2E_STAFF: AuthenticatedUser = {
  id: "staff-e2e",
  name: "Lucía",
  lastName: "Gómez",
  email: "staff@move.test",
  phone: "+59899765432",
  birthDate: null,
  role: "staff",
};

export function isStaffScenario(scenario: string | null): boolean {
  return scenario !== null && scenario.startsWith("staff");
}

export type ScenarioName =
  | "none"
  | "active"
  | "active-last-day"
  | "expiring"
  | "expiring-queued"
  | "active-with-upcoming"
  | "active-with-two-upcoming"
  | "scheduled"
  | "expired"
  | "packs"
  | "packs-expiring"
  | "full"
  | "long-name";

export type AutoDebitScenario =
  | "auto-debit-active"
  | "auto-debit-pending"
  | "auto-debit-provider-down";

// A cookie that starts with `staff` signs in the staff user; `checkin-pending` leaves a monthly check-in to answer.
export type FollowupScenario = "staff" | "staff-empty" | "staff-error" | "checkin-pending";

// `payments` signs in a client whose payment history has every state and more than one page; `payments-empty` has none.
export type PaymentHistoryScenario = "payments" | "payments-empty";

// `activity` signs in a client with a streak, every attendance state and more than one page of history;
// `activity-empty` has never attended.
export type ActivityScenario = "activity" | "activity-empty";

// `inbox-mixed` signs in a client with the seven kinds of notice (three unread); `inbox-empty` has none and
// `inbox-error` fails. `staff-announcements-mixed` signs in the staff with active and expired announcements.
export type InboxScenario =
  | "inbox-empty"
  | "inbox-mixed"
  | "inbox-error"
  | "staff-announcements-mixed";

// See BIRTHDAY_SCENARIOS in fake-birthdays.ts.
export type BirthdayScenario = "staff-birthdays" | "staff-birthdays-empty" | "client-birthday";

// A cookie that starts with `staff-clients` signs in the staff on the clients screens (create, edit, password,
// deactivation); `staff-clients-provider-down` makes Mercado Pago fail when a client is deactivated.
export type StaffClientsScenario = "staff-clients" | "staff-clients-provider-down";

// A cookie that starts with `staff-booking` signs in the staff on Reservar and the offline charges (see
// fake-offline-charges.ts); `staff-booking-no-storage` has the receipt upload turned off.
export type StaffBookingScenario = "staff-booking" | "staff-booking-no-storage";

// `staff-dashboard*` signs in the staff on the dashboard's Hoy view (see fake-dashboard.ts): a busy day, a day with
// nothing to do, and a busy day where only "Cobrar hoy" fails. The Negocio stats answer the same scenarios:
// `staff-dashboard-empty` is a business with no data yet and `staff-dashboard-money-down` a busy day where only
// the Plata stats fail. `staff-dashboard-money-currency` makes Plata answer 409 DASHBOARD_UNSUPPORTED_CURRENCY.
export type DashboardScenario =
  | "staff-dashboard"
  | "staff-dashboard-empty"
  | "staff-dashboard-collect-down"
  | "staff-dashboard-money-down"
  | "staff-dashboard-money-currency";

// `offline-paid` signs in a client whose history has a cash payment recorded by the team, with its receipt.
export type OfflinePaidScenario = "offline-paid";

export type SpecialScenario =
  | "error"
  | "slow"
  | "checkout-provider-down"
  | "checkout-plan-inactive"
  | AutoDebitScenario
  | FollowupScenario
  | PaymentHistoryScenario
  | ActivityScenario
  | InboxScenario
  | BirthdayScenario
  | StaffClientsScenario
  | StaffBookingScenario
  | DashboardScenario
  | OfflinePaidScenario
  // The API refuses the session: the account was deactivated while it was open.
  | "account-deactivated";

const ACTIVE_TRIMESTRAL: PerformanceSubscriptionDto = {
  id: "sub-active-trimestral",
  planId: "plan-trimestral",
  planName: "Trimestral",
  startsOn: "2026-08-15",
  endsOn: "2026-11-15",
  status: "active",
  daysLeft: 34,
  expiringSoon: false,
  purchaseId: null,
  awaitingPayment: false,
};

const UPCOMING_TRIMESTRAL: PerformanceSubscriptionDto = {
  id: "sub-upcoming-trimestral",
  planId: "plan-trimestral",
  planName: "Trimestral",
  startsOn: "2026-11-16",
  endsOn: "2027-02-15",
  status: "scheduled",
  daysLeft: 126,
  expiringSoon: false,
  purchaseId: null,
  awaitingPayment: false,
};

const UPCOMING_MENSUAL: PerformanceSubscriptionDto = {
  id: "sub-upcoming-mensual",
  planId: "plan-mensual",
  planName: "Mensual",
  startsOn: "2027-02-16",
  endsOn: "2027-03-15",
  status: "scheduled",
  daysLeft: 154,
  expiringSoon: false,
  purchaseId: null,
  awaitingPayment: false,
};

const PACKS: RecoveryPackDto[] = [
  {
    id: "pack-4",
    planId: "plan-pack-4",
    planName: "Paquete 4 sesiones",
    startsOn: "2026-10-10",
    endsOn: "2026-11-08",
    sessionsTotal: 4,
    sessionsUsed: 1,
    sessionsLeft: 3,
    daysLeft: 27,
    expiringSoon: false,
    purchaseId: null,
    awaitingPayment: false,
  },
  {
    id: "pack-8",
    planId: "plan-pack-8",
    planName: "Paquete 8 sesiones",
    startsOn: "2026-09-20",
    endsOn: "2026-12-19",
    sessionsTotal: 8,
    sessionsUsed: 8,
    sessionsLeft: 0,
    daysLeft: 68,
    expiringSoon: false,
    purchaseId: null,
    awaitingPayment: false,
  },
];

// The API flags the pack as about to expire; the front only shows it.
const EXPIRING_PACK: RecoveryPackDto = {
  id: "pack-expiring",
  planId: "plan-pack-4",
  planName: "Paquete 4 sesiones",
  startsOn: "2026-09-20",
  endsOn: "2026-10-20",
  sessionsTotal: 4,
  sessionsUsed: 1,
  sessionsLeft: 3,
  daysLeft: 8,
  expiringSoon: true,
  purchaseId: null,
  awaitingPayment: false,
};

// The API flags the plan as about to expire, with nothing queued after it; the front only shows it.
const EXPIRING_MENSUAL: PerformanceSubscriptionDto = {
  id: "sub-expiring-mensual",
  planId: "plan-mensual",
  planName: "Mensual",
  startsOn: "2026-09-23",
  endsOn: "2026-10-22",
  status: "active",
  daysLeft: 10,
  expiringSoon: true,
  purchaseId: null,
  awaitingPayment: false,
};

// A plan already bought after it: the API does not flag it, however few days are left.
const EXPIRING_QUEUED: PerformanceSubscriptionDto = {
  id: "sub-expiring-queued",
  planId: "plan-mensual",
  planName: "Mensual",
  startsOn: "2026-09-15",
  endsOn: "2026-10-15",
  status: "active",
  daysLeft: 3,
  expiringSoon: false,
  purchaseId: null,
  awaitingPayment: false,
};

// "Today" is 2026-10-12 in every scenario; status and daysLeft are written
// as the back would compute them because the fake API does no date math.
export const SCENARIOS = {
  none: { performance: null, upcomingPerformances: [], recoveryPacks: [] },
  active: {
    performance: ACTIVE_TRIMESTRAL,
    upcomingPerformances: [],
    recoveryPacks: [],
  },
  "active-last-day": {
    performance: {
      id: "sub-active-last-day",
      planId: "plan-mensual",
      planName: "Mensual",
      startsOn: "2026-09-13",
      endsOn: "2026-10-12",
      status: "active",
      daysLeft: 0,
      expiringSoon: false,
      purchaseId: null,
      awaitingPayment: false,
    },
    upcomingPerformances: [],
    recoveryPacks: [],
  },
  expiring: { performance: EXPIRING_MENSUAL, upcomingPerformances: [], recoveryPacks: [] },
  "expiring-queued": {
    performance: EXPIRING_QUEUED,
    upcomingPerformances: [UPCOMING_TRIMESTRAL],
    recoveryPacks: [],
  },
  "active-with-upcoming": {
    performance: ACTIVE_TRIMESTRAL,
    upcomingPerformances: [UPCOMING_TRIMESTRAL],
    recoveryPacks: [],
  },
  "active-with-two-upcoming": {
    performance: ACTIVE_TRIMESTRAL,
    upcomingPerformances: [UPCOMING_TRIMESTRAL, UPCOMING_MENSUAL],
    recoveryPacks: [],
  },
  scheduled: {
    performance: {
      id: "sub-scheduled-mensual",
      planId: "plan-mensual",
      planName: "Mensual",
      startsOn: "2026-11-01",
      endsOn: "2026-11-30",
      status: "scheduled",
      daysLeft: 49,
      expiringSoon: false,
      purchaseId: null,
      awaitingPayment: false,
    },
    upcomingPerformances: [],
    recoveryPacks: [],
  },
  expired: {
    performance: {
      id: "sub-expired-semestral",
      planId: "plan-semestral",
      planName: "Semestral",
      startsOn: "2026-03-01",
      endsOn: "2026-09-30",
      status: "expired",
      daysLeft: 0,
      expiringSoon: false,
      purchaseId: null,
      awaitingPayment: false,
    },
    upcomingPerformances: [],
    recoveryPacks: [],
  },
  packs: { performance: null, upcomingPerformances: [], recoveryPacks: PACKS },
  "packs-expiring": { performance: null, upcomingPerformances: [], recoveryPacks: [EXPIRING_PACK] },
  full: {
    performance: ACTIVE_TRIMESTRAL,
    upcomingPerformances: [UPCOMING_TRIMESTRAL],
    recoveryPacks: PACKS,
  },
  "long-name": {
    performance: {
      id: "sub-long-name",
      planId: "plan-semestral",
      planName: "Semestral de alto rendimiento con seguimiento",
      startsOn: "2026-07-01",
      endsOn: "2026-12-31",
      status: "active",
      daysLeft: 80,
      expiringSoon: false,
      purchaseId: null,
      awaitingPayment: false,
    },
    upcomingPerformances: [],
    recoveryPacks: [
      {
        id: "pack-long-name",
        planId: "plan-pack-12",
        planName: "Paquete Recovery de 12 sesiones con fisioterapia",
        startsOn: "2026-10-01",
        endsOn: "2026-12-30",
        sessionsTotal: 12,
        sessionsUsed: 3,
        sessionsLeft: 9,
        daysLeft: 79,
        expiringSoon: false,
        purchaseId: null,
        awaitingPayment: false,
      },
    ],
  },
} satisfies Record<ScenarioName, MySubscriptionsDto>;
