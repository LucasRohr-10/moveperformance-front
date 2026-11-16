import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api/errors";
import { apiFetchServer } from "@/lib/api/server";
import type { MyPaymentPageDto } from "@/lib/api/types";

import { getMyPayments } from "./get-my-payments";

vi.mock("@/lib/api/server");

const apiFetchServerMock = vi.mocked(apiFetchServer);

const emptyPage: MyPaymentPageDto = { items: [], total: 0, page: 1, pageSize: 20 };

describe("getMyPayments", () => {
  beforeEach(() => {
    apiFetchServerMock.mockReset();
  });

  it("asks the API for the page without an origin when there is none", async () => {
    apiFetchServerMock.mockResolvedValue(Response.json(emptyPage));

    await getMyPayments(undefined, 1);

    expect(apiFetchServerMock).toHaveBeenCalledWith("/api/v1/me/payments?page=1");
  });

  it("adds the origin when there is one", async () => {
    apiFetchServerMock.mockResolvedValue(Response.json(emptyPage));

    await getMyPayments("auto_debit", 2);

    expect(apiFetchServerMock).toHaveBeenCalledWith("/api/v1/me/payments?page=2&origin=auto_debit");
  });

  it("returns the parsed page", async () => {
    apiFetchServerMock.mockResolvedValue(Response.json(emptyPage));

    await expect(getMyPayments(undefined, 1)).resolves.toEqual(emptyPage);
  });

  it("throws the API's error when the request fails", async () => {
    apiFetchServerMock.mockResolvedValue(
      Response.json({ statusCode: 500, code: "INTERNAL", message: "x" }, { status: 500 }),
    );

    await expect(getMyPayments(undefined, 1)).rejects.toBeInstanceOf(ApiError);
  });
});
