import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api/errors";
import { apiFetchServer } from "@/lib/api/server";
import type { MySubscriptionsDto } from "@/lib/api/types";

import { getMySubscriptions } from "./get-my-subscriptions";

vi.mock("@/lib/api/server");

const apiFetchServerMock = vi.mocked(apiFetchServer);

describe("getMySubscriptions", () => {
  beforeEach(() => {
    apiFetchServerMock.mockReset();
  });

  it("asks the API for the client's subscriptions and returns the parsed body", async () => {
    const body: MySubscriptionsDto = {
      performance: null,
      upcomingPerformances: [],
      recoveryPacks: [],
    };
    apiFetchServerMock.mockResolvedValue(Response.json(body));

    await expect(getMySubscriptions()).resolves.toEqual(body);
    expect(apiFetchServerMock).toHaveBeenCalledWith("/api/v1/me/subscriptions");
  });

  it("throws the API's error when the request fails", async () => {
    apiFetchServerMock.mockResolvedValue(
      Response.json({ statusCode: 500, code: "INTERNAL", message: "x" }, { status: 500 }),
    );

    await expect(getMySubscriptions()).rejects.toBeInstanceOf(ApiError);
  });
});
