import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api/errors";
import { apiFetchServer } from "@/lib/api/server";
import type { ActivitySummaryDto } from "@/lib/api/types";

import { getMyActivitySummary } from "./get-my-activity-summary";

vi.mock("@/lib/api/server");

const apiFetchServerMock = vi.mocked(apiFetchServer);

const summary: ActivitySummaryDto = {
  month: "2026-10",
  monthAttendances: 8,
  frequencyPerWeek: 2.3,
  streak: 3,
  hasAttended: true,
};

describe("getMyActivitySummary", () => {
  beforeEach(() => {
    apiFetchServerMock.mockReset();
  });

  it("asks the API for the client's own summary and returns it", async () => {
    apiFetchServerMock.mockResolvedValue(Response.json(summary));

    await expect(getMyActivitySummary()).resolves.toEqual(summary);
    expect(apiFetchServerMock).toHaveBeenCalledWith("/api/v1/me/activity-summary");
  });

  it("throws the API's error when the request fails", async () => {
    apiFetchServerMock.mockResolvedValue(
      Response.json({ statusCode: 500, code: "INTERNAL", message: "x" }, { status: 500 }),
    );

    await expect(getMyActivitySummary()).rejects.toBeInstanceOf(ApiError);
  });
});
