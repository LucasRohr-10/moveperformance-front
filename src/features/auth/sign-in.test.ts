// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

import { SIGN_IN_ERRORS, signInWithEmail } from "./sign-in";

const credentials = { email: "ana@move.uy", password: "secret-123" };

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
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("signInWithEmail", () => {
  it("posts the credentials to Better Auth and lets the browser keep the session cookie", async () => {
    const fetchMock = stubFetch(new Response("{}", { status: 200 }));

    const result = await signInWithEmail(credentials);

    expect(result).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledWith(
      "http://api.test/api/auth/sign-in/email",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(credentials),
      },
    );
  });

  it("reports wrong email or password on 401", async () => {
    stubFetch(new Response("{}", { status: 401 }));

    const result = await signInWithEmail(credentials);

    expect(result).toEqual({
      ok: false,
      error: SIGN_IN_ERRORS.INVALID_CREDENTIALS,
    });
  });

  it("reports too many attempts on 429", async () => {
    stubFetch(new Response("{}", { status: 429 }));

    const result = await signInWithEmail(credentials);

    expect(result).toEqual({
      ok: false,
      error: SIGN_IN_ERRORS.TOO_MANY_ATTEMPTS,
    });
  });

  it("reports an unconfirmed email on 403", async () => {
    stubFetch(new Response("{}", { status: 403 }));

    const result = await signInWithEmail(credentials);

    expect(result).toEqual({
      ok: false,
      error: SIGN_IN_ERRORS.EMAIL_NOT_VERIFIED,
    });
  });

  it("reports a deactivated account on 403 ACCOUNT_DEACTIVATED", async () => {
    stubFetch(
      new Response(JSON.stringify({ code: "ACCOUNT_DEACTIVATED", message: "Cuenta desactivada." }), {
        status: 403,
      }),
    );

    const result = await signInWithEmail(credentials);

    expect(result).toEqual({ ok: false, error: SIGN_IN_ERRORS.ACCOUNT_DEACTIVATED });
  });

  it("still reports an unverified email on 403 EMAIL_NOT_VERIFIED and on a 403 without JSON", async () => {
    stubFetch(new Response(JSON.stringify({ code: "EMAIL_NOT_VERIFIED", message: "x" }), { status: 403 }));
    await expect(signInWithEmail(credentials)).resolves.toEqual({
      ok: false,
      error: SIGN_IN_ERRORS.EMAIL_NOT_VERIFIED,
    });

    stubFetch(new Response("<html>Forbidden</html>", { status: 403 }));
    await expect(signInWithEmail(credentials)).resolves.toEqual({
      ok: false,
      error: SIGN_IN_ERRORS.EMAIL_NOT_VERIFIED,
    });
  });

  it("reports the service as unavailable on a 500 with an HTML body", async () => {
    stubFetch(new Response("<html>Internal error</html>", { status: 500 }));

    const result = await signInWithEmail(credentials);

    expect(result).toEqual({ ok: false, error: SIGN_IN_ERRORS.UNAVAILABLE });
  });

  it("reports the service as unavailable when the API cannot be reached", async () => {
    stubFetch(new TypeError("Failed to fetch"));

    const result = await signInWithEmail(credentials);

    expect(result).toEqual({ ok: false, error: SIGN_IN_ERRORS.UNAVAILABLE });
  });

  it("builds the right URL when NEXT_PUBLIC_API_URL ends with a slash", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://api.test/");
    vi.resetModules();
    const { signInWithEmail: signInWithSlashUrl } = await import("./sign-in");
    const fetchMock = stubFetch(new Response("{}", { status: 200 }));

    await signInWithSlashUrl(credentials);

    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "http://api.test/api/auth/sign-in/email",
    );
  });
});
