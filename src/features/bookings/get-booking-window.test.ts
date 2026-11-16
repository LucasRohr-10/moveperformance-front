// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import { apiFetchClient } from "@/lib/api/client";
import type { BookingWindowDto } from "@/lib/api/types";

import { getBookingWindow } from "./get-booking-window";

vi.mock("@/lib/api/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/client")>()),
  apiFetchClient: vi.fn(),
}));

const apiFetchClientMock = vi.mocked(apiFetchClient);

describe("getBookingWindow", () => {
  beforeEach(() => {
    apiFetchClientMock.mockReset();
  });

  it("asks the API for the booking window and returns the parsed body", async () => {
    const body: BookingWindowDto = { bookingWindowDays: 30, lastBookableDate: "2026-11-21" };
    apiFetchClientMock.mockResolvedValue(Response.json(body));

    await expect(getBookingWindow()).resolves.toEqual(body);
    expect(apiFetchClientMock).toHaveBeenCalledWith("/api/v1/bookings/window");
  });
});
