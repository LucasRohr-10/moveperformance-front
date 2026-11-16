// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  SEND_VERIFICATION_EMAIL_ERRORS,
  sendVerificationEmail,
} from "./send-verification-email";

const input = {
  email: "ana@move.uy",
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

describe("sendVerificationEmail", () => {
  it("asks Better Auth for a new confirmation email", async () => {
    const fetchMock = stubFetch(
      new Response('{"status":true}', { status: 200 }),
    );

    const result = await sendVerificationEmail(input);

    expect(result).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledWith(
      "http://api.test/api/auth/send-verification-email",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(input),
      },
    );
  });

  it("reports the one-per-minute limit on 429", async () => {
    stubFetch(
      new Response('{"code":"VERIFICATION_EMAIL_COOLDOWN"}', { status: 429 }),
    );

    const result = await sendVerificationEmail(input);

    expect(result).toEqual({
      ok: false,
      error: SEND_VERIFICATION_EMAIL_ERRORS.COOLDOWN,
    });
  });

  it("reports the service as unavailable on a 500", async () => {
    stubFetch(new Response("<html>Internal error</html>", { status: 500 }));

    const result = await sendVerificationEmail(input);

    expect(result).toEqual({
      ok: false,
      error: SEND_VERIFICATION_EMAIL_ERRORS.UNAVAILABLE,
    });
  });

  it("reports the service as unavailable when the API cannot be reached", async () => {
    stubFetch(new TypeError("Failed to fetch"));

    const result = await sendVerificationEmail(input);

    expect(result).toEqual({
      ok: false,
      error: SEND_VERIFICATION_EMAIL_ERRORS.UNAVAILABLE,
    });
  });
});
