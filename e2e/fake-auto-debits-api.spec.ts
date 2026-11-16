import { randomUUID } from "node:crypto";

import { expect, test, type APIRequestContext } from "@playwright/test";

import type { AutoDebitCheckoutDto, AutoDebitDto, SimulatedDebitAction } from "@/lib/api/types";

import { E2E_PLAN_IDS } from "./support/checkout-fixtures";
import { OWNER_COOKIE, SCENARIO_COOKIE } from "./support/scenarios";

const API = `http://localhost:${Number(process.env.E2E_API_PORT ?? 4300)}/api/v1`;

// Each test is its own client, so debits created by one never show up in another running in parallel.
function as(scenario: string, owner: string = randomUUID()): { Cookie: string } {
  return { Cookie: `${SCENARIO_COOKIE}=${scenario}; ${OWNER_COOKIE}=${owner}` };
}

async function startDebit(
  request: APIRequestContext,
  headers: { Cookie: string },
  planId: string,
) {
  return request.post(`${API}/me/auto-debits`, { headers, data: { planId } });
}

async function simulate(
  request: APIRequestContext,
  headers: { Cookie: string },
  externalReference: string,
  action: SimulatedDebitAction,
): Promise<AutoDebitDto> {
  const response = await request.post(`${API}/payments/dev/simulate-auto-debit`, {
    headers,
    data: { externalReference, action },
  });
  expect(response.status()).toBe(200);
  return response.json();
}

test.describe("fake API: automatic debits", () => {
  test("creates a pending debit and authorizes it through the simulator", async ({ request }) => {
    const headers = as("none");

    const response = await startDebit(request, headers, E2E_PLAN_IDS.mensual);
    expect(response.status()).toBe(201);
    const created: AutoDebitCheckoutDto = await response.json();
    expect(created.redirectUrl).toMatch(new RegExp(`/checkout/simulado\\?debito=${created.externalReference}$`));

    const pending: AutoDebitDto = await (
      await request.get(`${API}/me/auto-debits/${created.externalReference}`, { headers })
    ).json();
    expect(pending).toMatchObject({
      externalReference: created.externalReference,
      planId: E2E_PLAN_IDS.mensual,
      planName: "Mensual",
      service: "performance",
      status: "pending",
      amount: 3900,
      currency: "UYU",
      frequency: 1,
      frequencyType: "months",
      nextChargeOn: null,
      cancelledAt: null,
      cancelReason: null,
    });

    const authorized = await simulate(request, headers, created.externalReference, "authorize");
    expect(authorized).toMatchObject({ status: "authorized", nextChargeOn: "2026-11-12" });

    const list: AutoDebitDto[] = await (await request.get(`${API}/me/auto-debits`, { headers })).json();
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ externalReference: created.externalReference, status: "authorized" });
  });

  test("takes the cycle of a pack in days", async ({ request }) => {
    const headers = as("none");
    const created: AutoDebitCheckoutDto = await (await startDebit(request, headers, E2E_PLAN_IDS.pack4)).json();

    const debit: AutoDebitDto = await (
      await request.get(`${API}/me/auto-debits/${created.externalReference}`, { headers })
    ).json();

    expect(debit).toMatchObject({ service: "recovery", frequency: 30, frequencyType: "days", amount: 3200 });
  });

  test("charging a cycle returns the debit unchanged and cancelling closes it", async ({ request }) => {
    const headers = as("none");
    const created: AutoDebitCheckoutDto = await (await startDebit(request, headers, E2E_PLAN_IDS.mensual)).json();
    const authorized = await simulate(request, headers, created.externalReference, "authorize");

    expect(await simulate(request, headers, created.externalReference, "charge_approved")).toEqual(authorized);
    expect(await simulate(request, headers, created.externalReference, "charge_rejected")).toEqual(authorized);

    const cancelled = await simulate(request, headers, created.externalReference, "cancel");
    expect(cancelled).toMatchObject({ status: "cancelled", cancelReason: "provider" });
  });

  test("cancels with DELETE by id and keeps the debit as cancelled", async ({ request }) => {
    const headers = as("none");
    const created: AutoDebitCheckoutDto = await (await startDebit(request, headers, E2E_PLAN_IDS.mensual)).json();
    const authorized = await simulate(request, headers, created.externalReference, "authorize");

    const response = await request.delete(`${API}/me/auto-debits/${authorized.id}`, { headers });

    expect(response.status()).toBe(200);
    expect(await response.json()).toMatchObject({ id: authorized.id, status: "cancelled", cancelReason: "client" });
    const [listed]: AutoDebitDto[] = await (await request.get(`${API}/me/auto-debits`, { headers })).json();
    expect(listed.status).toBe("cancelled");
  });

  test("lists only the debits of its own client", async ({ request }) => {
    await startDebit(request, as("none", "someone-else"), E2E_PLAN_IDS.mensual);

    const list: AutoDebitDto[] = await (await request.get(`${API}/me/auto-debits`, { headers: as("none") })).json();

    expect(list).toEqual([]);
  });

  test("answers AUTO_DEBIT_ACTIVE for Performance in the auto-debit-active scenario", async ({ request }) => {
    const headers = as("auto-debit-active");

    const list: AutoDebitDto[] = await (await request.get(`${API}/me/auto-debits`, { headers })).json();
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ service: "performance", status: "authorized", nextChargeOn: "2026-11-12" });

    const debit = await startDebit(request, headers, E2E_PLAN_IDS.mensual);
    expect(debit.status()).toBe(409);
    expect(await debit.json()).toMatchObject({ code: "AUTO_DEBIT_ACTIVE" });

    const purchase = await request.post(`${API}/checkout/plan`, {
      headers,
      data: { planId: E2E_PLAN_IDS.mensual },
    });
    expect(purchase.status()).toBe(409);
    expect(await purchase.json()).toMatchObject({ code: "AUTO_DEBIT_ACTIVE" });
  });

  test("still lets Recovery be bought in the auto-debit-active scenario", async ({ request }) => {
    const headers = as("auto-debit-active");

    expect((await startDebit(request, headers, E2E_PLAN_IDS.pack4)).status()).toBe(201);
    const purchase = await request.post(`${API}/checkout/plan`, { headers, data: { planId: E2E_PLAN_IDS.pack4 } });
    expect(purchase.status()).toBe(201);
  });

  test("answers AUTO_DEBIT_ACTIVE for a second Recovery debit once the first is authorized", async ({ request }) => {
    const headers = as("none");
    const first: AutoDebitCheckoutDto = await (await startDebit(request, headers, E2E_PLAN_IDS.pack4)).json();
    await simulate(request, headers, first.externalReference, "authorize");

    const second = await startDebit(request, headers, E2E_PLAN_IDS.pack4);

    expect(second.status()).toBe(409);
    expect(await second.json()).toMatchObject({ code: "AUTO_DEBIT_ACTIVE" });
    const purchase = await request.post(`${API}/checkout/plan`, { headers, data: { planId: E2E_PLAN_IDS.pack4 } });
    expect(purchase.status()).toBe(201);
  });

  test("has a pending Recovery debit in the auto-debit-pending scenario", async ({ request }) => {
    const list: AutoDebitDto[] = await (
      await request.get(`${API}/me/auto-debits`, { headers: as("auto-debit-pending") })
    ).json();

    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ service: "recovery", status: "pending", nextChargeOn: null });
  });

  test("answers 502 on cancel in the provider-down scenario, and on start", async ({ request }) => {
    const headers = as("auto-debit-provider-down");
    const [debit]: AutoDebitDto[] = await (await request.get(`${API}/me/auto-debits`, { headers })).json();

    const cancel = await request.delete(`${API}/me/auto-debits/${debit.id}`, { headers });
    expect(cancel.status()).toBe(502);
    expect(await cancel.json()).toMatchObject({ statusCode: 502, code: "PAYMENT_PROVIDER_ERROR" });
    const [after]: AutoDebitDto[] = await (await request.get(`${API}/me/auto-debits`, { headers })).json();
    expect(after.status).toBe("authorized");

    const start = await startDebit(request, headers, E2E_PLAN_IDS.pack4);
    expect(start.status()).toBe(502);
    expect(await start.json()).toMatchObject({ code: "PAYMENT_PROVIDER_ERROR" });
  });

  test("refuses a plan that cannot be debited or does not exist", async ({ request }) => {
    const headers = as("none");

    const notAllowed = await startDebit(request, headers, E2E_PLAN_IDS.trimestral);
    expect(notAllowed.status()).toBe(409);
    expect(await notAllowed.json()).toMatchObject({ code: "AUTO_DEBIT_NOT_ALLOWED" });

    const wrongKind = await startDebit(request, headers, E2E_PLAN_IDS.rehabEvaluation);
    expect(wrongKind.status()).toBe(409);
    expect(await wrongKind.json()).toMatchObject({ code: "PLAN_KIND_INVALID" });

    const unknown = await startDebit(request, headers, "plan-nope");
    expect(unknown.status()).toBe(404);
    expect(await unknown.json()).toMatchObject({ code: "PLAN_NOT_FOUND" });
  });

  test("answers 404 AUTO_DEBIT_NOT_FOUND for an unknown reference", async ({ request }) => {
    const response = await request.get(`${API}/me/auto-debits/${randomUUID()}`, { headers: as("none") });

    expect(response.status()).toBe(404);
    expect(await response.json()).toMatchObject({ code: "AUTO_DEBIT_NOT_FOUND" });
  });

  test("rejects the debit routes without a session", async ({ request }) => {
    const response = await request.get(`${API}/me/auto-debits`);

    expect(response.status()).toBe(401);
    expect(await response.json()).toMatchObject({ code: "UNAUTHENTICATED" });
  });
});
