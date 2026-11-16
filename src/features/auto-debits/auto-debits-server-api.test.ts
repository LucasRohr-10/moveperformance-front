import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api/errors";
import { apiFetchServer } from "@/lib/api/server";
import type { AutoDebitDto } from "@/lib/api/types";

import { getMyAutoDebits } from "./auto-debits-server-api";

vi.mock("@/lib/api/server");

const apiFetchServerMock = vi.mocked(apiFetchServer);

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

describe("getMyAutoDebits", () => {
  beforeEach(() => {
    apiFetchServerMock.mockReset();
  });

  it("lists the debits on the server forwarding the session", async () => {
    apiFetchServerMock.mockResolvedValue(Response.json([debit]));

    await expect(getMyAutoDebits()).resolves.toEqual([debit]);
    expect(apiFetchServerMock).toHaveBeenCalledWith("/api/v1/me/auto-debits");
  });

  it("throws the API's error when the request fails", async () => {
    apiFetchServerMock.mockResolvedValue(
      Response.json({ statusCode: 500, code: "INTERNAL", message: "x" }, { status: 500 }),
    );

    await expect(getMyAutoDebits()).rejects.toBeInstanceOf(ApiError);
  });
});
