import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api/errors";
import { apiFetchServer } from "@/lib/api/server";
import type { BookingResponse } from "@/lib/api/types";

import { getMyUpcomingBookings } from "./get-my-upcoming-bookings";

vi.mock("@/lib/api/server");

const apiFetchServerMock = vi.mocked(apiFetchServer);

describe("getMyUpcomingBookings", () => {
  beforeEach(() => {
    apiFetchServerMock.mockReset();
  });

  it("asks the API for the upcoming bookings and returns the parsed body", async () => {
    const body: BookingResponse[] = [];
    apiFetchServerMock.mockResolvedValue(Response.json(body));

    await expect(getMyUpcomingBookings()).resolves.toEqual(body);
    expect(apiFetchServerMock).toHaveBeenCalledWith("/api/v1/me/bookings?scope=upcoming");
  });

  it("throws the API's error when the request fails", async () => {
    apiFetchServerMock.mockResolvedValue(
      Response.json({ statusCode: 500, code: "INTERNAL", message: "x" }, { status: 500 }),
    );

    await expect(getMyUpcomingBookings()).rejects.toBeInstanceOf(ApiError);
  });
});
