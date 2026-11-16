// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api/errors";
import { apiFetchServer } from "@/lib/api/server";

import { getTodaySummary } from "./get-today-summary";
import { SUMMARY } from "./today-fixtures";

vi.mock("@/lib/api/server", () => ({ apiFetchServer: vi.fn() }));

const apiFetchServerMock = vi.mocked(apiFetchServer);

describe("getTodaySummary", () => {
  beforeEach(() => {
    apiFetchServerMock.mockReset();
  });

  it("reads today's summary", async () => {
    apiFetchServerMock.mockResolvedValue(Response.json(SUMMARY));

    await expect(getTodaySummary()).resolves.toEqual(SUMMARY);
    expect(apiFetchServerMock).toHaveBeenCalledWith("/api/v1/staff/dashboard/today");
  });

  it("throws on an API error", async () => {
    apiFetchServerMock.mockResolvedValue(Response.json({ statusCode: 500, code: "INTERNAL" }, { status: 500 }));

    const error = await getTodaySummary().catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).body.statusCode).toBe(500);
  });
});
