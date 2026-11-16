// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import { apiFetchClient } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import type { AutoDebitDto } from "@/lib/api/types";

import {
  cancelAutoDebit,
  getAutoDebitStatus,
  listMyAutoDebits,
  simulateAutoDebit,
  startAutoDebit,
} from "./auto-debits-api";

vi.mock("@/lib/api/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/client")>()),
  apiFetchClient: vi.fn(),
}));

const apiFetchClientMock = vi.mocked(apiFetchClient);

const debit = {
  id: "debit-1",
  externalReference: "ref-1",
  planId: "plan-1",
  planName: "Mensual",
  service: "performance",
  status: "authorized",
  amount: 1990,
  currency: "UYU",
  frequency: 1,
  frequencyType: "months",
  nextChargeOn: "2026-11-12",
  createdAt: "2026-10-12T10:00:00.000Z",
  cancelledAt: null,
  cancelReason: null,
} satisfies AutoDebitDto;

const jsonPost = (body: unknown) => ({
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

describe("auto debits API", () => {
  beforeEach(() => {
    apiFetchClientMock.mockReset();
  });

  it("starts an automatic debit with the plan id", async () => {
    const created = { externalReference: "ref-1", redirectUrl: "https://mp.test/subscribe" };
    apiFetchClientMock.mockResolvedValue(Response.json(created, { status: 201 }));

    await expect(startAutoDebit("plan-1")).resolves.toEqual(created);
    expect(apiFetchClientMock).toHaveBeenCalledWith("/api/v1/me/auto-debits", jsonPost({ planId: "plan-1" }));
  });

  it("reads a debit by its encoded reference", async () => {
    apiFetchClientMock.mockResolvedValue(Response.json(debit));

    await expect(getAutoDebitStatus("a b")).resolves.toEqual(debit);
    expect(apiFetchClientMock).toHaveBeenCalledWith("/api/v1/me/auto-debits/a%20b");
  });

  it("lists the debits of the client", async () => {
    apiFetchClientMock.mockResolvedValue(Response.json([debit]));

    await expect(listMyAutoDebits()).resolves.toEqual([debit]);
    expect(apiFetchClientMock).toHaveBeenCalledWith("/api/v1/me/auto-debits");
  });

  it("cancels a debit with DELETE", async () => {
    apiFetchClientMock.mockResolvedValue(Response.json({ ...debit, status: "cancelled" }));

    await expect(cancelAutoDebit("debit-1")).resolves.toMatchObject({ status: "cancelled" });
    expect(apiFetchClientMock).toHaveBeenCalledWith("/api/v1/me/auto-debits/debit-1", { method: "DELETE" });
  });

  it("simulates an action on a debit", async () => {
    apiFetchClientMock.mockResolvedValue(Response.json(debit));

    await expect(simulateAutoDebit("ref-1", "charge_approved")).resolves.toEqual(debit);
    expect(apiFetchClientMock).toHaveBeenCalledWith(
      "/api/v1/payments/dev/simulate-auto-debit",
      jsonPost({ externalReference: "ref-1", action: "charge_approved" }),
    );
  });

  it("throws the API error with its message", async () => {
    apiFetchClientMock.mockResolvedValue(
      Response.json(
        {
          statusCode: 502,
          code: "PAYMENT_PROVIDER_ERROR",
          message: "No pudimos cancelar el débito en Mercado Pago.",
        },
        { status: 502 },
      ),
    );

    const failure = await cancelAutoDebit("debit-1").catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(ApiError);
    expect((failure as ApiError).body.code).toBe("PAYMENT_PROVIDER_ERROR");
    expect((failure as ApiError).body.message).toBe("No pudimos cancelar el débito en Mercado Pago.");
  });
});
