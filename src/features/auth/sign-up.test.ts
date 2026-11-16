// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

import { SIGN_UP_ERRORS, signUpWithEmail } from "./sign-up";

const credentials = {
  name: "Ana",
  lastName: "Perez",
  birthDate: "1990-03-12",
  email: "ana@move.uy",
  phone: "+59899123456",
  password: "secret-123",
  callbackURL: "http://localhost:3000/verify-email",
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

describe("signUpWithEmail", () => {
  it("posts the credentials to Better Auth", async () => {
    const fetchMock = stubFetch(new Response("{}", { status: 200 }));

    const result = await signUpWithEmail(credentials);

    expect(result).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledWith(
      "http://api.test/api/auth/sign-up/email",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(credentials),
      },
    );
  });

  it("reports a too-short password on a 400 with that code", async () => {
    stubFetch(
      new Response(JSON.stringify({ code: "PASSWORD_TOO_SHORT" }), {
        status: 400,
      }),
    );

    const result = await signUpWithEmail(credentials);

    expect(result).toEqual({
      ok: false,
      error: SIGN_UP_ERRORS.PASSWORD_TOO_SHORT,
    });
  });

  it("reports invalid profile data on a 400 with that code", async () => {
    stubFetch(
      new Response(JSON.stringify({ code: "INVALID_PROFILE_INPUT" }), {
        status: 400,
      }),
    );

    const result = await signUpWithEmail(credentials);

    expect(result).toEqual({
      ok: false,
      error: SIGN_UP_ERRORS.INVALID_PROFILE,
    });
  });

  it("reports the service as unavailable on an unrecognized 400", async () => {
    stubFetch(
      new Response(JSON.stringify({ code: "INVALID_EMAIL" }), { status: 400 }),
    );

    const result = await signUpWithEmail(credentials);

    expect(result).toEqual({ ok: false, error: SIGN_UP_ERRORS.UNAVAILABLE });
  });

  it("reports the service as unavailable on a 500 with an HTML body", async () => {
    stubFetch(new Response("<html>Internal error</html>", { status: 500 }));

    const result = await signUpWithEmail(credentials);

    expect(result).toEqual({ ok: false, error: SIGN_UP_ERRORS.UNAVAILABLE });
  });

  it("reports the service as unavailable when the API cannot be reached", async () => {
    stubFetch(new TypeError("Failed to fetch"));

    const result = await signUpWithEmail(credentials);

    expect(result).toEqual({ ok: false, error: SIGN_UP_ERRORS.UNAVAILABLE });
  });
});
