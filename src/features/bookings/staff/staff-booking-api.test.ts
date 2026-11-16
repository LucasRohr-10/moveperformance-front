// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api/errors";

import {
  createClientBookings,
  getClientBatchEligibility,
  getClientSlots,
  getClientSubscriptions,
  getOfflineChargeAllowance,
} from "./staff-booking-api";

function stubFetch(response: Response) {
  const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(response);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

const JSON_HEADERS = { "Content-Type": "application/json" };

describe("staff booking API", () => {
  it("reads the client's subscriptions", async () => {
    const fetchMock = stubFetch(Response.json({ plans: [], packages: [] }));

    await getClientSubscriptions("c1");

    expect(fetchMock).toHaveBeenCalledWith("http://api.test/api/v1/staff/clients/c1/subscriptions", {
      credentials: "include",
    });
  });

  it("reads the client's slots for a service and date", async () => {
    const fetchMock = stubFetch(Response.json([]));

    await getClientSlots("c1", "rehab", "2026-11-06");

    expect(fetchMock).toHaveBeenCalledWith(
      "http://api.test/api/v1/staff/clients/c1/slots?service=rehab&date=2026-11-06",
      { credentials: "include" },
    );
  });

  it("previews eligibility in the cart order", async () => {
    const fetchMock = stubFetch(Response.json([]));

    await getClientBatchEligibility("c1", ["s2", "s1"]);

    expect(fetchMock).toHaveBeenCalledWith(
      "http://api.test/api/v1/staff/clients/c1/batch-eligibility",
      {
        method: "POST",
        headers: JSON_HEADERS,
        body: '{"timeSlotIds":["s2","s1"]}',
        credentials: "include",
      },
    );
  });

  it("books with method and rehab kind, never an amount", async () => {
    const fetchMock = stubFetch(Response.json({ booked: [], failed: [] }));

    await createClientBookings("c1", {
      paymentMethod: "cash",
      items: [{ timeSlotId: "s1", rehabKind: "evaluation" }, { timeSlotId: "s2" }],
    });

    expect(fetchMock).toHaveBeenCalledWith("http://api.test/api/v1/staff/clients/c1/bookings", {
      method: "POST",
      headers: JSON_HEADERS,
      body: '{"paymentMethod":"cash","items":[{"timeSlotId":"s1","rehabKind":"evaluation"},{"timeSlotId":"s2"}]}',
      credentials: "include",
    });
  });

  it("reads the offline charge allowance", async () => {
    const fetchMock = stubFetch(Response.json({ open: 1, limit: 2, remaining: 1 }));

    await expect(getOfflineChargeAllowance("c1")).resolves.toEqual({ open: 1, limit: 2, remaining: 1 });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://api.test/api/v1/staff/clients/c1/offline-charge-allowance",
      { credentials: "include" },
    );
  });

  it("throws ApiError on 403 ACCOUNT_DEACTIVATED", async () => {
    stubFetch(
      Response.json(
        { statusCode: 403, code: "ACCOUNT_DEACTIVATED", message: "Account deactivated" },
        { status: 403 },
      ),
    );

    const error = await getClientSubscriptions("c1").catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ body: { code: "ACCOUNT_DEACTIVATED" } });
  });
});
