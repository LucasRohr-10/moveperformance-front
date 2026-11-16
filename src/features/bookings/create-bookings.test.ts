// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import { apiFetchClient } from "@/lib/api/client";
import type { BookingsBatchDto } from "@/lib/api/types";

import { createBookings } from "./create-bookings";

vi.mock("@/lib/api/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/client")>()),
  apiFetchClient: vi.fn(),
}));

const apiFetchClientMock = vi.mocked(apiFetchClient);

describe("createBookings", () => {
  beforeEach(() => {
    apiFetchClientMock.mockReset();
  });

  it("posts the slot ids as a batch and returns booked and failed", async () => {
    const body: BookingsBatchDto = {
      booked: [],
      failed: [{ timeSlotId: "slot-2", code: "SLOT_FULL", message: "Completo" }],
    };
    apiFetchClientMock.mockResolvedValue(Response.json(body));

    await expect(createBookings(["slot-1", "slot-2"])).resolves.toEqual(body);
    expect(apiFetchClientMock).toHaveBeenCalledWith("/api/v1/bookings/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ timeSlotIds: ["slot-1", "slot-2"] }),
    });
  });
});
