import { describe, expect, it } from "vitest";

import type { MySubscriptionsDto, PerformanceSubscriptionDto, RecoveryPackDto } from "@/lib/api/types";

import { repeatLimitFor } from "./repeat-limit";

const LAST = "2026-11-21";

function performancePlan(endsOn: string): PerformanceSubscriptionDto {
  return {
    id: "p",
    planId: "plan",
    planName: "Mensual",
    startsOn: "2026-10-01",
    endsOn,
    status: "active",
    daysLeft: 10,
    expiringSoon: false,
    purchaseId: null,
    awaitingPayment: false,
  };
}

function pack(sessionsLeft: number, endsOn: string): RecoveryPackDto {
  return {
    id: `pack-${endsOn}`,
    planId: "plan",
    planName: "Pack",
    startsOn: "2026-10-01",
    endsOn,
    sessionsTotal: 4,
    sessionsUsed: 4 - sessionsLeft,
    sessionsLeft,
    daysLeft: 10,
    expiringSoon: false,
    purchaseId: null,
    awaitingPayment: false,
  };
}

function subs(overrides: Partial<MySubscriptionsDto>): MySubscriptionsDto {
  return { performance: null, upcomingPerformances: [], recoveryPacks: [], ...overrides };
}

describe("repeatLimitFor", () => {
  it("has no repeat for rehab", () => {
    expect(repeatLimitFor("rehab", subs({ performance: performancePlan("2026-11-10") }), LAST)).toBeNull();
  });

  it("has no repeat without subscriptions or without a plan", () => {
    expect(repeatLimitFor("performance", null, LAST)).toBeNull();
    expect(repeatLimitFor("performance", subs({}), LAST)).toBeNull();
  });

  it("limits performance to the plan end when it is before the window", () => {
    const result = repeatLimitFor("performance", subs({ performance: performancePlan("2026-11-10") }), LAST);

    expect(result).toEqual({ untilDate: "2026-11-10", maxSlots: null });
  });

  it("limits performance to the window when a queued plan reaches further", () => {
    const result = repeatLimitFor(
      "performance",
      subs({ performance: performancePlan("2026-11-10"), upcomingPerformances: [performancePlan("2027-01-21")] }),
      LAST,
    );

    expect(result).toEqual({ untilDate: LAST, maxSlots: null });
  });

  it("limits recovery to the window and to the sessions left", () => {
    const result = repeatLimitFor(
      "recovery",
      subs({ recoveryPacks: [pack(1, "2026-11-15"), pack(2, "2026-11-30")] }),
      LAST,
    );

    expect(result).toEqual({ untilDate: LAST, maxSlots: 3 });
  });

  it("has no repeat for recovery without sessions left", () => {
    expect(repeatLimitFor("recovery", subs({ recoveryPacks: [pack(0, "2026-11-30")] }), LAST)).toBeNull();
  });
});
