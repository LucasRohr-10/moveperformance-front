// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  GOOGLE_SIGN_IN_ERRORS,
  signInWithGoogle,
} from "./sign-in-with-google";

const urls = {
  callbackURL: "http://localhost:3000/dashboard",
  errorCallbackURL: "http://localhost:3000/login",
};

const GOOGLE_URL = "https://accounts.google.com/o/oauth2/v2/auth?client_id=abc";

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

describe("signInWithGoogle", () => {
  it("asks Better Auth for the Google URL, keeping the API's cookie", async () => {
    const fetchMock = stubFetch(
      new Response(JSON.stringify({ url: GOOGLE_URL, redirect: true }), {
        status: 200,
      }),
    );

    const result = await signInWithGoogle(urls);

    expect(result).toEqual({ ok: true, url: GOOGLE_URL });
    expect(fetchMock).toHaveBeenCalledWith(
      "http://api.test/api/auth/sign-in/social",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ provider: "google", ...urls }),
      },
    );
  });

  it("reports the service as unavailable when the API rejects the request", async () => {
    stubFetch(new Response("{}", { status: 403 }));

    const result = await signInWithGoogle(urls);

    expect(result).toEqual({
      ok: false,
      error: GOOGLE_SIGN_IN_ERRORS.UNAVAILABLE,
    });
  });

  it("reports the service as unavailable when the answer has no URL", async () => {
    stubFetch(new Response("{}", { status: 200 }));

    const result = await signInWithGoogle(urls);

    expect(result).toEqual({
      ok: false,
      error: GOOGLE_SIGN_IN_ERRORS.UNAVAILABLE,
    });
  });

  it("reports the service as unavailable when the answer is not JSON", async () => {
    stubFetch(new Response("<html>oops</html>", { status: 200 }));

    const result = await signInWithGoogle(urls);

    expect(result).toEqual({
      ok: false,
      error: GOOGLE_SIGN_IN_ERRORS.UNAVAILABLE,
    });
  });

  it("reports the service as unavailable when the API cannot be reached", async () => {
    stubFetch(new TypeError("Failed to fetch"));

    const result = await signInWithGoogle(urls);

    expect(result).toEqual({
      ok: false,
      error: GOOGLE_SIGN_IN_ERRORS.UNAVAILABLE,
    });
  });
});
