// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

import { RESET_PASSWORD_ERRORS, resetPassword } from "./reset-password";

const input = { newPassword: "new-secret-123", token: "valid-token-123" };

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

describe("resetPassword", () => {
  it("posts the new password and token to Better Auth", async () => {
    const fetchMock = stubFetch(new Response("{}", { status: 200 }));

    const result = await resetPassword(input);

    expect(result).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledWith(
      "http://api.test/api/auth/reset-password",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(input),
      },
    );
  });

  it("reports an invalid or expired token on a 400 with that code", async () => {
    stubFetch(
      new Response(JSON.stringify({ code: "INVALID_TOKEN" }), { status: 400 }),
    );

    const result = await resetPassword(input);

    expect(result).toEqual({
      ok: false,
      error: RESET_PASSWORD_ERRORS.INVALID_TOKEN,
    });
  });

  it("reports a too-short password on a 400 with that code", async () => {
    stubFetch(
      new Response(JSON.stringify({ code: "PASSWORD_TOO_SHORT" }), {
        status: 400,
      }),
    );

    const result = await resetPassword(input);

    expect(result).toEqual({
      ok: false,
      error: RESET_PASSWORD_ERRORS.PASSWORD_TOO_SHORT,
    });
  });

  it("maps a too-long password to the same password-too-short message", async () => {
    stubFetch(
      new Response(JSON.stringify({ code: "PASSWORD_TOO_LONG" }), {
        status: 400,
      }),
    );

    const result = await resetPassword(input);

    expect(result).toEqual({
      ok: false,
      error: RESET_PASSWORD_ERRORS.PASSWORD_TOO_SHORT,
    });
  });

  it("reports the service as unavailable on an unrecognized 400", async () => {
    stubFetch(
      new Response(JSON.stringify({ code: "USER_NOT_FOUND" }), {
        status: 400,
      }),
    );

    const result = await resetPassword(input);

    expect(result).toEqual({
      ok: false,
      error: RESET_PASSWORD_ERRORS.UNAVAILABLE,
    });
  });

  it("reports the service as unavailable when the API cannot be reached", async () => {
    stubFetch(new TypeError("Failed to fetch"));

    const result = await resetPassword(input);

    expect(result).toEqual({
      ok: false,
      error: RESET_PASSWORD_ERRORS.UNAVAILABLE,
    });
  });
});
