// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import { apiFetchClient } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";

import {
  fetchOfflineOptions,
  getPurchaseStatus,
  simulatePayment,
  startBookingCheckout,
  startPlanCheckout,
} from "./checkout-api";

vi.mock("@/lib/api/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/client")>()),
  apiFetchClient: vi.fn(),
}));

const apiFetchClientMock = vi.mocked(apiFetchClient);

const checkoutBody = {
  purchaseId: "p1",
  externalReference: "ref-1",
  redirectUrl: "https://mp.test/pay",
  bookingId: null,
  holdExpiresAt: null,
};

const jsonPost = (body: unknown) => ({
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

describe("checkout API", () => {
  beforeEach(() => {
    apiFetchClientMock.mockReset();
  });

  it("starts a plan checkout with the plan id", async () => {
    apiFetchClientMock.mockResolvedValue(Response.json(checkoutBody, { status: 201 }));

    await expect(startPlanCheckout("plan-1")).resolves.toEqual(checkoutBody);
    expect(apiFetchClientMock).toHaveBeenCalledWith("/api/v1/checkout/plan", jsonPost({ planId: "plan-1" }));
  });

  it("starts a booking checkout with the plan and the slot", async () => {
    apiFetchClientMock.mockResolvedValue(Response.json(checkoutBody, { status: 201 }));

    await startBookingCheckout("plan-1", "slot-1");

    expect(apiFetchClientMock).toHaveBeenCalledWith(
      "/api/v1/checkout/booking",
      jsonPost({ planId: "plan-1", timeSlotId: "slot-1" }),
    );
  });

  it.each([
    ["one_time", "mercado_pago"],
    ["cash", "cash"],
    ["transfer", "transfer"],
  ] as const)("sends the payment method of a plan checkout: %s", async (mode, method) => {
    apiFetchClientMock.mockResolvedValue(Response.json(checkoutBody, { status: 201 }));

    await startPlanCheckout("plan-1", mode);

    expect(apiFetchClientMock).toHaveBeenCalledWith(
      "/api/v1/checkout/plan",
      jsonPost({ planId: "plan-1", paymentMethod: method }),
    );
  });

  it("sends the payment method of a booking checkout", async () => {
    apiFetchClientMock.mockResolvedValue(Response.json(checkoutBody, { status: 201 }));

    await startBookingCheckout("plan-1", "slot-1", "transfer");

    expect(apiFetchClientMock).toHaveBeenCalledWith(
      "/api/v1/checkout/booking",
      jsonPost({ planId: "plan-1", timeSlotId: "slot-1", paymentMethod: "transfer" }),
    );
  });

  it("reads what the client can pay by hand", async () => {
    const options = { discountPercent: 10, transferDetails: null, unpaid: { count: 0, limit: 2, items: [] } };
    apiFetchClientMock.mockResolvedValue(Response.json(options));

    await expect(fetchOfflineOptions()).resolves.toEqual(options);
    expect(apiFetchClientMock).toHaveBeenCalledWith("/api/v1/checkout/offline-options");
  });

  it("reads a purchase by its encoded reference", async () => {
    apiFetchClientMock.mockResolvedValue(Response.json({ externalReference: "a b" }));

    await getPurchaseStatus("a b");

    expect(apiFetchClientMock).toHaveBeenCalledWith("/api/v1/checkout/purchases/a%20b");
  });

  it("simulates a payment outcome", async () => {
    apiFetchClientMock.mockResolvedValue(Response.json({ externalReference: "r1", status: "approved" }));

    await expect(simulatePayment("r1", "approved")).resolves.toEqual({
      externalReference: "r1",
      status: "approved",
    });
    expect(apiFetchClientMock).toHaveBeenCalledWith(
      "/api/v1/payments/dev/simulate",
      jsonPost({ externalReference: "r1", outcome: "approved" }),
    );
  });

  it("rejects with the API's error when the provider fails", async () => {
    apiFetchClientMock.mockResolvedValue(
      Response.json(
        {
          statusCode: 502,
          code: "PAYMENT_PROVIDER_ERROR",
          message: "No pudimos iniciar el pago. Probá de nuevo en unos minutos.",
        },
        { status: 502 },
      ),
    );

    const failure = await startPlanCheckout("plan-1").catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(ApiError);
    expect((failure as ApiError).body.code).toBe("PAYMENT_PROVIDER_ERROR");
  });
});
