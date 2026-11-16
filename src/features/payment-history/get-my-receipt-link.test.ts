import { beforeEach, describe, expect, it, vi } from "vitest";

import { apiFetchClient } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";

import { getMyReceiptLink } from "./get-my-receipt-link";

vi.mock("@/lib/api/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/client")>()),
  apiFetchClient: vi.fn(),
}));

const apiFetchClientMock = vi.mocked(apiFetchClient);

beforeEach(() => vi.clearAllMocks());

describe("getMyReceiptLink", () => {
  it("asks for the client's own receipt link", async () => {
    const link = { url: "https://files.test/r?sig=1", expiresAt: "2026-11-02T13:00:00.000Z" };
    apiFetchClientMock.mockResolvedValue(Response.json(link));

    await expect(getMyReceiptLink("purchase 1")).resolves.toEqual(link);
    expect(apiFetchClientMock).toHaveBeenCalledWith("/api/v1/me/payments/purchase%201/receipt");
  });

  it("throws the API's error when there is no receipt", async () => {
    apiFetchClientMock.mockResolvedValue(
      Response.json({ statusCode: 404, code: "RECEIPT_NOT_FOUND", message: "x" }, { status: 404 }),
    );

    await expect(getMyReceiptLink("purchase-1")).rejects.toBeInstanceOf(ApiError);
  });
});
