// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  REQUEST_PASSWORD_RESET_ERRORS,
  requestPasswordReset,
} from "./request-password-reset";

const input = {
  email: "ana@move.uy",
  redirectTo: "http://localhost:3000/reset-password",
};

function stubFetch(outcome: Response | Error) {
  const fetchMock = vi.fn<typeof fetch>();
  if (outcome instanceof Error) fetchMock.mockRejectedValue(outcome);
  else fetchMock.mockResolvedValue(outcome);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("requestPasswordReset", () => {
  it("posts the email and redirectTo to Better Auth", async () => {
    const fetchMock = stubFetch(
      new Response(JSON.stringify({ status: true }), { status: 200 }),
    );

    const result = await requestPasswordReset(input);

    expect(result).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledWith(
      "http://api.test/api/auth/request-password-reset",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(input),
      },
    );
  });

  it("reports the service as unavailable on a non-2xx response", async () => {
    stubFetch(new Response("{}", { status: 500 }));

    const result = await requestPasswordReset(input);

    expect(result).toEqual({
      ok: false,
      error: REQUEST_PASSWORD_RESET_ERRORS.UNAVAILABLE,
    });
  });

  it("reports the service as unavailable when the API cannot be reached", async () => {
    stubFetch(new TypeError("Failed to fetch"));

    const result = await requestPasswordReset(input);

    expect(result).toEqual({
      ok: false,
      error: REQUEST_PASSWORD_RESET_ERRORS.UNAVAILABLE,
    });
  });
});
