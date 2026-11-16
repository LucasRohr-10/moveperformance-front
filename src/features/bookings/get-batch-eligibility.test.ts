// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import { apiFetchClient } from "@/lib/api/client";
import type { SlotEligibilityDto } from "@/lib/api/types";

import { getBatchEligibility } from "./get-batch-eligibility";

vi.mock("@/lib/api/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/client")>()),
  apiFetchClient: vi.fn(),
}));

const apiFetchClientMock = vi.mocked(apiFetchClient);

describe("getBatchEligibility", () => {
  beforeEach(() => {
    apiFetchClientMock.mockReset();
  });

  it("posts the slot ids in order and returns the per-slot verdicts", async () => {
    const body: SlotEligibilityDto[] = [
      { timeSlotId: "slot-1", covered: true, reason: null },
      { timeSlotId: "slot-2", covered: false, reason: "PACKAGE_REQUIRED" },
    ];
    apiFetchClientMock.mockResolvedValue(Response.json(body));

    await expect(getBatchEligibility(["slot-1", "slot-2"])).resolves.toEqual(body);
    expect(apiFetchClientMock).toHaveBeenCalledWith("/api/v1/bookings/batch-eligibility", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ timeSlotIds: ["slot-1", "slot-2"] }),
    });
  });
});
