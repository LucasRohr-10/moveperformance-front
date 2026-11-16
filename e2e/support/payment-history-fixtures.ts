import type { MyPaymentDto } from "@/lib/api/types";

// One payment per state (not sorted by date: the fake API answers them in this order), then enough approved ones to need a second page (20 per page).
const base = {
  origin: "one_time",
  paymentMethod: "mercado_pago",
  paidOn: null,
  hasReceipt: false,
  kind: "plan",
  service: "performance",
  itemName: "Mensual",
  amount: 2400,
  currency: "UYU",
  approvedAt: null,
  lastPaymentAt: null,
  refundedAt: null,
  paymentId: null,
  reasonCode: null,
  delivered: null,
} as const;

const PERIOD = { type: "plan", startsOn: "2026-10-20", endsOn: "2026-11-19", sessionsTotal: null } as const;

const STATE_SAMPLES: MyPaymentDto[] = [
  {
    ...base,
    id: "pay-processing",
    state: "processing",
    createdAt: "2026-10-26T13:10:00.000Z",
    lastPaymentAt: "2026-10-26T13:14:00.000Z",
    paymentId: "1234567890",
  },
  {
    ...base,
    id: "pay-approved-debit",
    state: "approved",
    origin: "auto_debit",
    createdAt: "2026-10-20T12:02:00.000Z",
    approvedAt: "2026-10-20T12:03:00.000Z",
    lastPaymentAt: "2026-10-20T12:02:30.000Z",
    paymentId: "1234500011",
    delivered: PERIOD,
  },
  {
    ...base,
    id: "pay-declined",
    state: "declined",
    service: "recovery",
    itemName: "Paquete 4 sesiones",
    amount: 3600,
    createdAt: "2026-10-09T21:40:00.000Z",
    lastPaymentAt: "2026-10-09T21:42:00.000Z",
    paymentId: "1234498877",
    reasonCode: "cc_rejected_insufficient_amount",
  },
  {
    ...base,
    id: "pay-approved-booking",
    state: "approved",
    kind: "booking",
    service: "recovery",
    itemName: "Sesión individual",
    amount: 900,
    createdAt: "2026-10-14T20:19:00.000Z",
    approvedAt: "2026-10-14T20:20:00.000Z",
    lastPaymentAt: "2026-10-14T20:19:30.000Z",
    paymentId: "1234490021",
    delivered: { type: "booking", startsAt: "2026-10-16T21:00:00.000Z" },
  },
  {
    ...base,
    id: "pay-waiting",
    state: "waiting",
    service: "rehab",
    itemName: "Evaluación",
    amount: 1500,
    createdAt: "2026-10-12T14:05:00.000Z",
  },
  {
    ...base,
    id: "pay-expired",
    state: "expired",
    amount: 2400,
    createdAt: "2026-10-02T23:31:00.000Z",
  },
  {
    ...base,
    id: "pay-refunded",
    state: "refunded",
    origin: "auto_debit",
    createdAt: "2026-09-20T12:01:00.000Z",
    approvedAt: "2026-09-20T12:02:00.000Z",
    lastPaymentAt: "2026-09-20T12:01:30.000Z",
    refundedAt: "2026-09-24T18:40:00.000Z",
    paymentId: "1233901204",
  },
];

const EXTRA_APPROVED_COUNT = 25;

const EXTRA_APPROVED: MyPaymentDto[] = Array.from({ length: EXTRA_APPROVED_COUNT }, (_, index) => ({
  ...base,
  id: `pay-older-${index}`,
  state: "approved",
  createdAt: new Date(Date.UTC(2026, 7, 28 - index)).toISOString(),
  approvedAt: new Date(Date.UTC(2026, 7, 28 - index, 12)).toISOString(),
  paymentId: `90000${index}`,
  delivered: PERIOD,
}));

export const E2E_PAYMENTS: MyPaymentDto[] = [...STATE_SAMPLES, ...EXTRA_APPROVED];
