// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

import { cancelBooking } from "./attendance-api";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("attendance API", () => {
  it("cancelBooking posts the reason and returns what happened to the payment", async () => {
    const result = { bookingId: "b1", paymentOutcome: "session_returned" };
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(Response.json(result));
    vi.stubGlobal("fetch", fetchMock);

    await expect(cancelBooking("b1", "Mantenimiento")).resolves.toEqual(result);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://api.test/api/v1/staff/bookings/b1/cancel");
    expect(init?.method).toBe("POST");
    expect(JSON.parse(init?.body as string)).toEqual({ reason: "Mantenimiento" });
  });
});
