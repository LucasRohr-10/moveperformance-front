// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

import { SIGN_OUT_ERRORS, signOut } from "./sign-out";

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

describe("signOut", () => {
  it("posts to Better Auth's sign-out endpoint with the session cookie", async () => {
    const fetchMock = stubFetch(new Response("{}", { status: 200 }));

    const result = await signOut();

    expect(result).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledWith("http://api.test/api/auth/sign-out", {
      method: "POST",
      credentials: "include",
    });
  });

  it("reports the service as unavailable on a non-2xx response", async () => {
    stubFetch(new Response("{}", { status: 500 }));

    const result = await signOut();

    expect(result).toEqual({ ok: false, error: SIGN_OUT_ERRORS.UNAVAILABLE });
  });

  it("reports the service as unavailable when the API cannot be reached", async () => {
    stubFetch(new TypeError("Failed to fetch"));

    const result = await signOut();

    expect(result).toEqual({ ok: false, error: SIGN_OUT_ERRORS.UNAVAILABLE });
  });
});
