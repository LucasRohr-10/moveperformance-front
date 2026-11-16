import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api/errors";
import { apiFetchServer } from "@/lib/api/server";

import { getPendingCheckin } from "./checkins-server-api";

vi.mock("@/lib/api/server");

const apiFetchServerMock = vi.mocked(apiFetchServer);

describe("getPendingCheckin", () => {
  beforeEach(() => {
    apiFetchServerMock.mockReset();
  });

  it("reads the pending check-in on the server forwarding the session", async () => {
    const pending = { checkin: { id: "c-1", period: "2026-10", firstName: "Ana" } };
    apiFetchServerMock.mockResolvedValue(Response.json(pending));

    await expect(getPendingCheckin()).resolves.toEqual(pending);
    expect(apiFetchServerMock).toHaveBeenCalledWith("/api/v1/me/checkins/pending");
  });

  it("throws the API's error when the request fails", async () => {
    apiFetchServerMock.mockResolvedValue(
      Response.json({ statusCode: 500, code: "INTERNAL", message: "x" }, { status: 500 }),
    );

    await expect(getPendingCheckin()).rejects.toBeInstanceOf(ApiError);
  });
});
