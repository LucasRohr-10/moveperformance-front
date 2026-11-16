import { describe, expect, it } from "vitest";

import {
  autoDebitResultHref,
  autoDebitSimulatorHref,
  bookingCheckoutHref,
  bookingCheckoutHrefFor,
  planCheckoutHref,
  reserveHref,
  resultHref,
  retryHref,
} from "./checkout-routes";

describe("planCheckoutHref", () => {
  it("points at the checkout of the plan", () => {
    expect(planCheckoutHref("plan-trimestral")).toBe("/checkout/plan/plan-trimestral");
  });

  it("encodes the id", () => {
    expect(planCheckoutHref("a b/c")).toBe("/checkout/plan/a%20b%2Fc");
  });
});

describe("bookingCheckoutHref", () => {
  it("carries the service, the Montevideo date and the slot", () => {
    expect(
      bookingCheckoutHref({ service: "rehab", slotId: "s1", startsAt: "2026-10-21T13:00:00.000Z" }),
    ).toBe("/checkout/reserva?service=rehab&date=2026-10-21&slot=s1");
  });

  it("uses the Montevideo day for a slot at 23:30 there, which is already the next day in UTC", () => {
    expect(
      bookingCheckoutHref({ service: "rehab", slotId: "s1", startsAt: "2026-10-22T02:30:00.000Z" }),
    ).toBe("/checkout/reserva?service=rehab&date=2026-10-21&slot=s1");
  });
});

describe("bookingCheckoutHrefFor", () => {
  it("carries the service, the date it is given and the slot", () => {
    expect(bookingCheckoutHrefFor({ service: "recovery", date: "2026-10-21", slotId: "s9" })).toBe(
      "/checkout/reserva?service=recovery&date=2026-10-21&slot=s9",
    );
  });

  it("encodes values that are not safe in a query", () => {
    expect(bookingCheckoutHrefFor({ service: "rehab", date: "a&b", slotId: "x y" })).toBe(
      "/checkout/reserva?service=rehab&date=a%26b&slot=x+y",
    );
  });
});

describe("reserveHref", () => {
  it.each([["performance"], ["rehab"], ["recovery"]] as const)("points at the slot picker of %s", (service) => {
    expect(reserveHref(service)).toBe(`/reservar?service=${service}`);
  });
});

describe("resultHref", () => {
  it("carries the reference", () => {
    expect(resultHref("r1")).toBe("/checkout/resultado?ref=r1");
  });

  it("adds the provider status when it is rejected", () => {
    expect(resultHref("r1", "rejected")).toBe("/checkout/resultado?ref=r1&status=rejected");
  });
});

describe("retryHref", () => {
  it("sends a plan purchase back to the checkout of its own plan", () => {
    expect(retryHref({ kind: "plan", service: "performance", planId: "plan-trimestral" })).toBe(
      "/checkout/plan/plan-trimestral",
    );
  });

  it("sends a booking purchase back to the slot picker of its service", () => {
    expect(retryHref({ kind: "booking", service: "recovery", planId: "plan-recovery-single" })).toBe(
      "/reservar?service=recovery",
    );
  });
});

describe("auto debit routes", () => {
  it("point the result and the simulator at the debit reference", () => {
    expect(autoDebitResultHref("r1")).toBe("/checkout/resultado?debito=r1");
    expect(autoDebitSimulatorHref("r1")).toBe("/checkout/simulado?debito=r1");
  });

  it("encode the reference", () => {
    expect(autoDebitResultHref("a b/c")).toBe("/checkout/resultado?debito=a+b%2Fc");
  });
});
