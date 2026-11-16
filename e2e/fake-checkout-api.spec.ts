import { expect, test, type APIRequestContext } from "@playwright/test";

import type {
  BookableSlot,
  CheckoutResponseDto,
  PlanDto,
  PurchaseStatusDto,
  SimulatePaymentResponseDto,
} from "@/lib/api/types";

import {
  CHECKOUT_REFS,
  E2E_PLAN_IDS,
  SEEDED_PURCHASES,
} from "./support/checkout-fixtures";
import { SCENARIO_COOKIE } from "./support/scenarios";
import { simulateFromTest } from "./support/simulate";

const API = `http://localhost:${Number(process.env.E2E_API_PORT ?? 4300)}/api/v1`;
const REHAB_OPEN_SLOT = "slot-rehab-2026-10-21-1000";
const REHAB_FULL_SLOT = "slot-rehab-2026-10-21-1100";
const MS_PER_MINUTE = 60_000;
const HOLD_MINUTES = 15;

function as(scenario: string): { Cookie: string } {
  return { Cookie: `${SCENARIO_COOKIE}=${scenario}` };
}

async function checkoutPlan(
  request: APIRequestContext,
  planId: string,
  scenario = "none",
) {
  return request.post(`${API}/checkout/plan`, {
    headers: as(scenario),
    data: { planId },
  });
}

async function checkoutBooking(
  request: APIRequestContext,
  planId: string,
  timeSlotId: string,
  scenario = "none",
) {
  return request.post(`${API}/checkout/booking`, {
    headers: as(scenario),
    data: { planId, timeSlotId },
  });
}

async function readPurchase(
  request: APIRequestContext,
  ref: string,
): Promise<PurchaseStatusDto> {
  const response = await request.get(`${API}/checkout/purchases/${ref}`, {
    headers: as("none"),
  });
  expect(response.status()).toBe(200);
  return response.json();
}

test.describe("fake API: plan checkout", () => {
  test("creates a pending purchase that only the simulator approves", async ({ request }) => {
    const response = await checkoutPlan(request, E2E_PLAN_IDS.trimestral);
    expect(response.status()).toBe(201);
    const created: CheckoutResponseDto = await response.json();

    expect(created.redirectUrl).toMatch(
      new RegExp(`/checkout/simulado\\?ref=${created.externalReference}$`),
    );
    expect(created.bookingId).toBeNull();
    expect(created.holdExpiresAt).toBeNull();

    const pending = await readPurchase(request, created.externalReference);
    expect(pending).toMatchObject({
      kind: "plan",
      status: "pending",
      itemName: "Trimestral",
      service: "performance",
      amount: 10500,
      planId: E2E_PLAN_IDS.trimestral,
      bookingId: null,
      startsAt: null,
    });

    await simulateFromTest(request, created.externalReference, "rejected");
    expect((await readPurchase(request, created.externalReference)).status).toBe("pending");

    await simulateFromTest(request, created.externalReference, "approved");
    expect((await readPurchase(request, created.externalReference)).status).toBe("approved");
  });

  test("answers the simulator with the purchase status after applying", async ({ request }) => {
    const created: CheckoutResponseDto = await (
      await checkoutPlan(request, E2E_PLAN_IDS.mensual)
    ).json();

    const response = await request.post(`${API}/payments/dev/simulate`, {
      headers: as("none"),
      data: { externalReference: created.externalReference, outcome: "approved" },
    });
    expect(response.status()).toBe(200);
    const body: SimulatePaymentResponseDto = await response.json();
    expect(body).toEqual({ externalReference: created.externalReference, status: "approved" });
  });

  test("answers 502 with the exact message when the provider is down", async ({ request }) => {
    const response = await checkoutPlan(request, E2E_PLAN_IDS.mensual, "checkout-provider-down");
    expect(response.status()).toBe(502);
    expect(await response.json()).toMatchObject({
      statusCode: 502,
      code: "PAYMENT_PROVIDER_ERROR",
      message: "No pudimos iniciar el pago. Probá de nuevo en unos minutos.",
    });
  });

  test("answers 409 when the plan is inactive", async ({ request }) => {
    const response = await checkoutPlan(request, E2E_PLAN_IDS.mensual, "checkout-plan-inactive");
    expect(response.status()).toBe(409);
    expect(await response.json()).toMatchObject({
      code: "PLAN_INACTIVE",
      message: "Este plan no está disponible.",
    });
  });

  test("checks plan existence before kind before inactivity", async ({ request }) => {
    const unknown = await checkoutPlan(request, "plan-nope", "checkout-plan-inactive");
    expect(unknown.status()).toBe(404);
    expect(await unknown.json()).toMatchObject({
      code: "PLAN_NOT_FOUND",
      message: "El plan no existe.",
    });

    const wrongKind = await checkoutPlan(
      request,
      E2E_PLAN_IDS.rehabEvaluation,
      "checkout-plan-inactive",
    );
    expect(wrongKind.status()).toBe(400);
    expect(await wrongKind.json()).toMatchObject({
      code: "PLAN_KIND_INVALID",
      message: "El tipo de plan no es válido para esta operación.",
    });
  });

  test("rejects a checkout without a session", async ({ request }) => {
    const response = await request.post(`${API}/checkout/plan`, {
      data: { planId: E2E_PLAN_IDS.mensual },
    });
    expect(response.status()).toBe(401);
    expect(await response.json()).toMatchObject({ code: "UNAUTHENTICATED" });
  });
});

test.describe("fake API: booking checkout", () => {
  test("creates a pending booking purchase with the slot start and a hold", async ({ request }) => {
    const before = Date.now();
    const response = await checkoutBooking(request, E2E_PLAN_IDS.rehabEvaluation, REHAB_OPEN_SLOT);
    expect(response.status()).toBe(201);
    const created: CheckoutResponseDto = await response.json();

    expect(created.bookingId).toBe(`booking-${created.externalReference}`);
    const holdMs = new Date(created.holdExpiresAt ?? "").getTime() - before;
    expect(holdMs).toBeGreaterThan((HOLD_MINUTES - 1) * MS_PER_MINUTE);
    expect(holdMs).toBeLessThan((HOLD_MINUTES + 1) * MS_PER_MINUTE);

    expect(await readPurchase(request, created.externalReference)).toMatchObject({
      kind: "booking",
      status: "pending",
      planId: E2E_PLAN_IDS.rehabEvaluation,
      bookingId: created.bookingId,
      startsAt: "2026-10-21T13:00:00.000Z",
    });
  });

  test("a rejected payment rejects the booking purchase", async ({ request }) => {
    const created: CheckoutResponseDto = await (
      await checkoutBooking(request, E2E_PLAN_IDS.rehabEvaluation, REHAB_OPEN_SLOT)
    ).json();

    await simulateFromTest(request, created.externalReference, "rejected");
    expect((await readPurchase(request, created.externalReference)).status).toBe("rejected");
  });

  test("answers 409 SLOT_FULL for a full slot", async ({ request }) => {
    const response = await checkoutBooking(request, E2E_PLAN_IDS.rehabEvaluation, REHAB_FULL_SLOT);
    expect(response.status()).toBe(409);
    expect(await response.json()).toMatchObject({
      code: "SLOT_FULL",
      message: "No quedan cupos para este turno.",
    });
  });

  test("answers 502 when the provider is down", async ({ request }) => {
    const response = await checkoutBooking(
      request,
      E2E_PLAN_IDS.rehabEvaluation,
      REHAB_OPEN_SLOT,
      "checkout-provider-down",
    );
    expect(response.status()).toBe(502);
    expect(await response.json()).toMatchObject({ code: "PAYMENT_PROVIDER_ERROR" });
  });

  test("checks the plan kind before the plan being inactive", async ({ request }) => {
    const response = await checkoutBooking(
      request,
      E2E_PLAN_IDS.mensual,
      REHAB_OPEN_SLOT,
      "checkout-plan-inactive",
    );
    expect(response.status()).toBe(400);
    expect(await response.json()).toMatchObject({ code: "PLAN_KIND_INVALID" });
  });

  test("answers 409 PLAN_INACTIVE for a valid booking plan", async ({ request }) => {
    const response = await checkoutBooking(
      request,
      E2E_PLAN_IDS.rehabEvaluation,
      REHAB_OPEN_SLOT,
      "checkout-plan-inactive",
    );
    expect(response.status()).toBe(409);
    expect(await response.json()).toMatchObject({ code: "PLAN_INACTIVE" });
  });
});

test.describe("fake API: purchase status and simulator", () => {
  for (const seeded of SEEDED_PURCHASES) {
    test(`seeded ${seeded.itemName} (${seeded.status}, ${seeded.kind}) answers its row`, async ({
      request,
    }) => {
      expect(await readPurchase(request, seeded.externalReference)).toEqual(seeded);
    });
  }

  test("a seeded purchase never changes, even when simulated", async ({ request }) => {
    const ref = CHECKOUT_REFS.pendingPlan;
    const response = await request.post(`${API}/payments/dev/simulate`, {
      headers: as("none"),
      data: { externalReference: ref, outcome: "approved" },
    });
    expect(response.status()).toBe(200);
    expect(await response.json()).toEqual({ externalReference: ref, status: "pending" });
    expect((await readPurchase(request, ref)).status).toBe("pending");
  });

  test("statusError answers 500", async ({ request }) => {
    const response = await request.get(
      `${API}/checkout/purchases/${CHECKOUT_REFS.statusError}`,
      { headers: as("none") },
    );
    expect(response.status()).toBe(500);
    expect(await response.json()).toMatchObject({
      code: "INTERNAL_ERROR",
      message: "Ocurrió un error inesperado.",
    });
  });

  test("an unknown ref answers 404 PURCHASE_NOT_FOUND", async ({ request }) => {
    const response = await request.get(`${API}/checkout/purchases/${CHECKOUT_REFS.unknown}`, {
      headers: as("none"),
    });
    expect(response.status()).toBe(404);
    expect(await response.json()).toMatchObject({
      code: "PURCHASE_NOT_FOUND",
      message: "No encontramos la compra.",
    });
  });

  test("simulating an unknown ref answers 404 PURCHASE_NOT_FOUND", async ({ request }) => {
    const response = await request.post(`${API}/payments/dev/simulate`, {
      headers: as("none"),
      data: { externalReference: CHECKOUT_REFS.unknown, outcome: "approved" },
    });
    expect(response.status()).toBe(404);
    expect(await response.json()).toMatchObject({ code: "PURCHASE_NOT_FOUND" });
  });

  test("simulating a ref that is not a uuid answers 400 VALIDATION_FAILED", async ({ request }) => {
    const response = await request.post(`${API}/payments/dev/simulate`, {
      headers: as("none"),
      data: { externalReference: "not-a-uuid", outcome: "approved" },
    });
    expect(response.status()).toBe(400);
    expect(await response.json()).toMatchObject({ code: "VALIDATION_FAILED" });
  });

  test("simulatorOff answers 404 NOT_FOUND", async ({ request }) => {
    const response = await request.post(`${API}/payments/dev/simulate`, {
      headers: as("none"),
      data: { externalReference: CHECKOUT_REFS.simulatorOff, outcome: "approved" },
    });
    expect(response.status()).toBe(404);
    expect(await response.json()).toMatchObject({ code: "NOT_FOUND", message: "No encontrado." });
  });

  test("rehab bookings answer the message of the real back", async ({ request }) => {
    const response = await request.post(`${API}/bookings`, {
      headers: as("full"),
      data: { timeSlotId: REHAB_OPEN_SLOT },
    });
    expect(response.status()).toBe(409);
    expect(await response.json()).toMatchObject({
      code: "REHAB_FOLLOWUP_NOT_ENABLED",
      message: "Esta cuenta no tiene habilitado el seguimiento de fisioterapia.",
    });
  });

  test("answers 401 without a session cookie", async ({ request }) => {
    const response = await request.get(
      `${API}/checkout/purchases/${CHECKOUT_REFS.approvedPlan}`,
    );
    expect(response.status()).toBe(401);
    expect(await response.json()).toMatchObject({ code: "UNAUTHENTICATED" });
  });
});

test.describe("fake API: a simulated payment on a purchase that is not pending", () => {
  async function createdPlanRef(request: APIRequestContext): Promise<string> {
    const created: CheckoutResponseDto = await (
      await checkoutPlan(request, E2E_PLAN_IDS.mensual)
    ).json();
    return created.externalReference;
  }

  async function createdBookingRef(request: APIRequestContext): Promise<string> {
    const created: CheckoutResponseDto = await (
      await checkoutBooking(request, E2E_PLAN_IDS.rehabEvaluation, REHAB_OPEN_SLOT)
    ).json();
    return created.externalReference;
  }

  test("approving a plan purchase twice keeps it approved and flags it", async ({ request }) => {
    const ref = await createdPlanRef(request);

    await simulateFromTest(request, ref, "approved");
    expect(await readPurchase(request, ref)).toMatchObject({
      status: "approved",
      needsAttention: false,
    });

    await simulateFromTest(request, ref, "approved");
    expect(await readPurchase(request, ref)).toMatchObject({
      status: "approved",
      needsAttention: true,
    });
  });

  test("approving a rejected booking purchase leaves it rejected and flags it", async ({
    request,
  }) => {
    const ref = await createdBookingRef(request);
    await simulateFromTest(request, ref, "rejected");

    await simulateFromTest(request, ref, "approved");

    expect(await readPurchase(request, ref)).toMatchObject({
      status: "rejected",
      needsAttention: true,
    });
  });

  test("a rejection only closes a pending booking purchase", async ({ request }) => {
    const bookingRef = await createdBookingRef(request);
    await simulateFromTest(request, bookingRef, "approved");
    await simulateFromTest(request, bookingRef, "rejected");
    expect(await readPurchase(request, bookingRef)).toMatchObject({
      status: "approved",
      needsAttention: false,
    });

    const planRef = await createdPlanRef(request);
    await simulateFromTest(request, planRef, "approved");
    await simulateFromTest(request, planRef, "rejected");
    expect(await readPurchase(request, planRef)).toMatchObject({
      status: "approved",
      needsAttention: false,
    });
  });
});

test.describe("fake API: plans and slots", () => {
  test("lists the three Recovery plans, publicly", async ({ request }) => {
    const response = await request.get(`${API}/plans?service=recovery`);
    expect(response.status()).toBe(200);
    const plans: PlanDto[] = await response.json();
    expect(plans.map((plan) => plan.id)).toEqual([
      E2E_PLAN_IDS.recoverySingle,
      E2E_PLAN_IDS.pack4,
      E2E_PLAN_IDS.pack8,
    ]);
  });

  test("lists every plan without a service filter", async ({ request }) => {
    const plans: PlanDto[] = await (await request.get(`${API}/plans`)).json();
    expect(plans).toHaveLength(7);
  });

  test("returns the two rehab slots with exact instants", async ({ request }) => {
    const response = await request.get(
      `${API}/bookings/slots?service=rehab&date=2026-10-21`,
      { headers: as("none") },
    );
    expect(response.status()).toBe(200);
    const slots: BookableSlot[] = await response.json();
    expect(slots.map((slot) => [slot.id, slot.startsAt, slot.isFull, slot.available])).toEqual([
      [REHAB_OPEN_SLOT, "2026-10-21T13:00:00.000Z", false, 3],
      [REHAB_FULL_SLOT, "2026-10-21T14:00:00.000Z", true, 0],
    ]);
  });

  test("public slots need no session", async ({ request }) => {
    const response = await request.get(
      `${API}/bookings/public-slots?service=recovery&date=2026-10-21`,
    );
    expect(response.status()).toBe(200);
    expect(await response.json()).toHaveLength(2);
  });

  test("slots reject a malformed date", async ({ request }) => {
    const response = await request.get(`${API}/bookings/slots?service=rehab&date=21-10-2026`, {
      headers: as("none"),
    });
    expect(response.status()).toBe(400);
    expect(await response.json()).toMatchObject({ code: "VALIDATION_FAILED" });
  });

  test("slots need a session", async ({ request }) => {
    const response = await request.get(`${API}/bookings/slots?service=rehab&date=2026-10-21`);
    expect(response.status()).toBe(401);
  });
});

test.describe("fake API: POST /bookings", () => {
  const cases: Array<[string, string, number, string?]> = [
    ["slot-performance-2026-10-21-1000", "active", 201],
    ["slot-performance-2026-10-21-1000", "none", 409, "PLAN_REQUIRED"],
    ["slot-recovery-2026-10-21-1000", "packs", 201],
    ["slot-recovery-2026-10-21-1000", "none", 409, "PACKAGE_REQUIRED"],
    ["slot-rehab-2026-10-21-1000", "full", 409, "REHAB_FOLLOWUP_NOT_ENABLED"],
  ];

  for (const [timeSlotId, scenario, status, code] of cases) {
    test(`${timeSlotId} under ${scenario} answers ${status}`, async ({ request }) => {
      const response = await request.post(`${API}/bookings`, {
        headers: as(scenario),
        data: { timeSlotId },
      });
      expect(response.status()).toBe(status);
      const body = await response.json();
      if (code) expect(body).toMatchObject({ code });
      else expect(body).toMatchObject({ status: "confirmed", timeSlotId });
    });
  }
});

test.describe("fake API: special scenarios keep subscriptions empty", () => {
  for (const scenario of ["checkout-provider-down", "checkout-plan-inactive"]) {
    test(`${scenario} answers none`, async ({ request }) => {
      const response = await request.get(`${API}/me/subscriptions`, { headers: as(scenario) });
      expect(response.status()).toBe(200);
      expect(await response.json()).toEqual({
        performance: null,
        upcomingPerformances: [],
        recoveryPacks: [],
      });
    });
  }
});
