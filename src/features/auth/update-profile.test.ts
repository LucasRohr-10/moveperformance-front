// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

import { UPDATE_PROFILE_ERRORS, updateProfile } from "./update-profile";

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

describe("updateProfile", () => {
  it("posts the missing fields to Better Auth's update-user with the session cookie", async () => {
    const fetchMock = stubFetch(new Response("{}", { status: 200 }));

    const result = await updateProfile({ phone: "+59899123456", birthDate: "1990-03-12" });

    expect(result).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledWith(
      "http://api.test/api/auth/update-user",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ phone: "+59899123456", birthDate: "1990-03-12" }),
      },
    );
  });

  it("reports an invalid profile on a 400 with the API's code", async () => {
    stubFetch(
      new Response(JSON.stringify({ code: "INVALID_PROFILE_INPUT" }), {
        status: 400,
      }),
    );

    await expect(updateProfile({ phone: "+59899123456" })).resolves.toEqual({
      ok: false,
      error: UPDATE_PROFILE_ERRORS.INVALID_PROFILE,
    });
  });

  it.each([
    ["a 401 (session expired)", new Response("{}", { status: 401 })],
    ["a 500 with an HTML body", new Response("<html></html>", { status: 500 })],
    ["a network failure", new TypeError("Failed to fetch")],
  ])("reports the service as unavailable on %s", async (_label, outcome) => {
    stubFetch(outcome);

    await expect(updateProfile({ phone: "+59899123456" })).resolves.toEqual({
      ok: false,
      error: UPDATE_PROFILE_ERRORS.UNAVAILABLE,
    });
  });
});
