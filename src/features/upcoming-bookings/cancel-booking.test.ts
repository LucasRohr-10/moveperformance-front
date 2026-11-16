// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import { apiFetchClient } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";

import { cancelBooking } from "./cancel-booking";

vi.mock("@/lib/api/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/client")>()),
  apiFetchClient: vi.fn(),
}));

const apiFetchClientMock = vi.mocked(apiFetchClient);

describe("cancelBooking", () => {
  beforeEach(() => {
    apiFetchClientMock.mockReset();
  });

  it("posts the cancellation for that booking and returns it", async () => {
    apiFetchClientMock.mockResolvedValue(Response.json({ id: "b1", status: "cancelled" }));

    await expect(cancelBooking("b1")).resolves.toEqual({ id: "b1", status: "cancelled" });
    expect(apiFetchClientMock).toHaveBeenCalledWith("/api/v1/bookings/b1/cancel", { method: "POST" });
  });

  it("returns whether the client has to contact MOVE for the refund", async () => {
    apiFetchClientMock.mockResolvedValue(Response.json({ id: "b1", status: "cancelled", contactForRefund: true }));

    await expect(cancelBooking("b1")).resolves.toMatchObject({ contactForRefund: true });
  });

  it("throws the API's error when the cancellation window is closed", async () => {
    apiFetchClientMock.mockResolvedValue(
      Response.json({ statusCode: 409, code: "CANCEL_WINDOW_CLOSED", message: "x" }, { status: 409 }),
    );

    await expect(cancelBooking("b1")).rejects.toBeInstanceOf(ApiError);
  });
});
