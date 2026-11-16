import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api/errors";

import { getPlans } from "./get-plans";

const fetchMock = vi.fn();

describe("getPlans", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllGlobals();
  });

  it("asks the public endpoint for the plans of one service, without cookies", async () => {
    fetchMock.mockResolvedValue(Response.json([{ id: "1" }]));

    await expect(getPlans("recovery")).resolves.toEqual([{ id: "1" }]);

    const [url, init] = fetchMock.mock.calls[0] as [URL, RequestInit];
    expect(url.toString()).toBe("http://api.test/api/v1/plans?service=recovery");
    expect(init.headers).toBeUndefined();
  });

  it("sends no service parameter when none is given", async () => {
    fetchMock.mockResolvedValue(Response.json([]));

    await getPlans();

    const [url] = fetchMock.mock.calls[0] as [URL];
    expect(url.toString()).toBe("http://api.test/api/v1/plans");
  });

  it("throws the API's error when the request is rejected", async () => {
    fetchMock.mockResolvedValue(
      Response.json(
        { statusCode: 400, code: "VALIDATION_FAILED", message: "Datos no válidos." },
        { status: 400 },
      ),
    );

    await expect(getPlans("performance")).rejects.toBeInstanceOf(ApiError);
  });
});
