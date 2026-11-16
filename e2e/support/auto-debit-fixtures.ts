import type { AutoDebitDto } from "@/lib/api/types";

import type { AutoDebitScenario } from "./scenarios";

// "Today" is 2026-10-12 in the fake API, so the first charge after authorizing is a month later.
export const NEXT_CHARGE_ON = "2026-11-12";

const ACTIVE_PERFORMANCE_DEBIT = {
  id: "debit-active-mensual",
  externalReference: "5b0f4e7a-3c1d-4a8e-9f2b-6d7c8e9a0b11",
  planId: "plan-mensual",
  planName: "Mensual",
  service: "performance",
  status: "authorized",
  amount: 3900,
  currency: "UYU",
  frequency: 1,
  frequencyType: "months",
  nextChargeOn: NEXT_CHARGE_ON,
  createdAt: "2026-10-01T12:00:00.000Z",
  cancelledAt: null,
  cancelReason: null,
} satisfies AutoDebitDto;

export const SEEDED_DEBITS = {
  "auto-debit-active": [ACTIVE_PERFORMANCE_DEBIT],
  "auto-debit-pending": [
    {
      id: "debit-pending-pack-4",
      externalReference: "8c2d1f3b-7a6e-4b5c-8d9e-0f1a2b3c4d22",
      planId: "plan-pack-4",
      planName: "Paquete 4 sesiones",
      service: "recovery",
      status: "pending",
      amount: 3200,
      currency: "UYU",
      frequency: 30,
      frequencyType: "days",
      nextChargeOn: null,
      createdAt: "2026-10-12T12:00:00.000Z",
      cancelledAt: null,
      cancelReason: null,
    },
  ],
  "auto-debit-provider-down": [
    {
      ...ACTIVE_PERFORMANCE_DEBIT,
      id: "debit-provider-down-mensual",
      externalReference: "9d3e2a4c-8b7f-4c6d-9eaf-1a2b3c4d5e33",
    },
  ],
} satisfies Record<AutoDebitScenario, AutoDebitDto[]>;
