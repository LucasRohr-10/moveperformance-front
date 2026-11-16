// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

import { updateSettings } from "./update-settings";

function stubFetch(outcome: Response | Error) {
  const fetchMock = vi.fn<typeof fetch>();
  if (outcome instanceof Error) {
    fetchMock.mockRejectedValue(outcome);
  } else {
    fetchMock.mockResolvedValue(outcome);
  }
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("updateSettings", () => {
  it("sends only the changed settings, with the session cookie", async () => {
    const values = {
      cancelLimitHours: 4,
      bookingWindowDays: 14,
      pendingPaymentMinutes: 15,
      expiringSoonDays: 7,
      noAttendanceDays: 7,
      prolongedInactivityDays: 30,
      frequencyDropRatio: 0.5,
      renewalGraceDays: 30,
    };
    const fetchMock = stubFetch(Response.json(values));

    const result = await updateSettings({ cancelLimitHours: 4 });

    expect(result).toEqual({ ok: true, values });
    expect(fetchMock).toHaveBeenCalledWith("http://api.test/api/v1/staff/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cancelLimitHours: 4 }),
      credentials: "include",
    });
  });

  it("sends a cleared price as null", async () => {
    const fetchMock = stubFetch(Response.json({}));

    await updateSettings({ offlinePriceRehabEvaluation: null });

    expect(fetchMock.mock.calls[0]?.[1]?.body).toBe(JSON.stringify({ offlinePriceRehabEvaluation: null }));
  });

  it("maps the API's error of a price onto its field", async () => {
    stubFetch(
      Response.json(
        {
          statusCode: 400,
          code: "VALIDATION_FAILED",
          message: "Los datos enviados no son válidos.",
          details: [{ field: "offlinePriceRecoverySession", messages: ["Tiene que ser un monto entre 0 y 100000."] }],
        },
        { status: 400 },
      ),
    );

    await expect(updateSettings({ offlinePriceRecoverySession: 999999 })).resolves.toEqual({
      ok: false,
      fieldErrors: { offlinePriceRecoverySession: "Tiene que ser un monto entre 0 y 100000." },
      message: null,
    });
  });

  it("maps the API's field errors onto the settings it knows", async () => {
    stubFetch(
      Response.json(
        {
          statusCode: 400,
          code: "VALIDATION_FAILED",
          message: "Los datos enviados no son válidos.",
          details: [
            { field: "cancelLimitHours", messages: ["Tiene que ser un número entero entre 0 y 72."] },
            { field: "somethingElse", messages: ["ignored"] },
          ],
        },
        { status: 400 },
      ),
    );

    await expect(updateSettings({ cancelLimitHours: 999 })).resolves.toEqual({
      ok: false,
      fieldErrors: { cancelLimitHours: "Tiene que ser un número entero entre 0 y 72." },
      message: null,
    });
  });

  it.each([
    ["the session expired", Response.json({ code: "UNAUTHENTICATED" }, { status: 401 })],
    ["the API answers with something that is not JSON", new Response("<html>", { status: 502 })],
    ["the network fails", new TypeError("fetch failed")],
  ])("gives a generic message when %s", async (_label, outcome) => {
    stubFetch(outcome);

    await expect(updateSettings({ cancelLimitHours: 4 })).resolves.toEqual({
      ok: false,
      fieldErrors: {},
      message: "No pudimos guardar los cambios. Probá de nuevo en unos minutos.",
    });
  });
});
