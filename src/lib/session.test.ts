// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

const redirectMock = vi.hoisted(() =>
  vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
);
const cookiesMock = vi.hoisted(() => vi.fn());
const headersMock = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({ redirect: redirectMock }));
vi.mock("next/headers", () => ({ cookies: cookiesMock, headers: headersMock }));

import { ROUTES } from "@/config/constants/routes.constants";
import { USER_ROLES } from "@/config/constants/user-roles.constants";

import {
  AccountDeactivatedError,
  type AuthenticatedUser,
  getCurrentUser,
  requireRole,
  requireUser,
  requireIncompleteProfile,
  SessionUnavailableError,
} from "./session";

const user: AuthenticatedUser = {
  id: "1",
  name: "Ana",
  lastName: "Perez",
  email: "ana@move.uy",
  phone: "+59899123456",
  birthDate: "1990-03-12",
  role: USER_ROLES.CLIENT,
};

const staffUser: AuthenticatedUser = {
  id: "2",
  name: "Juan",
  lastName: "Pereira",
  email: "juan@move.uy",
  phone: "+59894555555",
  birthDate: null,
  role: USER_ROLES.STAFF,
};

// Signed up with Google and has not added the phone yet.
const userWithoutPhone: AuthenticatedUser = { ...user, phone: null };

const clientWithoutBirthDate: AuthenticatedUser = { ...user, birthDate: null };

function stubCookies(serialized: string) {
  cookiesMock.mockResolvedValue({ toString: () => serialized });
}

function stubCurrentPath(value: string | null) {
  headersMock.mockResolvedValue({ get: () => value });
}

function stubFetch(outcome: Response | Error) {
  const fetchMock = vi.fn<typeof fetch>();
  if (outcome instanceof Error) fetchMock.mockRejectedValue(outcome);
  else fetchMock.mockResolvedValue(outcome);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe("getCurrentUser", () => {
  it("returns the user on a 200 response, forwarding the request cookies", async () => {
    stubCookies("better-auth.session_token=abc");
    const fetchMock = stubFetch(
      new Response(JSON.stringify(user), { status: 200 }),
    );

    await expect(getCurrentUser()).resolves.toEqual(user);
    expect(fetchMock).toHaveBeenCalledWith("http://api.test/api/v1/users/me", {
      headers: { Cookie: "better-auth.session_token=abc" },
      cache: "no-store",
    });
  });

  it("returns null on 401 — no session, not an error", async () => {
    stubCookies("");
    stubFetch(new Response("{}", { status: 401 }));

    await expect(getCurrentUser()).resolves.toBeNull();
  });

  it("throws SessionUnavailableError on a 500 instead of treating it as logged out", async () => {
    stubCookies("");
    stubFetch(new Response("{}", { status: 500 }));

    await expect(getCurrentUser()).rejects.toBeInstanceOf(
      SessionUnavailableError,
    );
  });

  it("throws SessionUnavailableError when the API cannot be reached", async () => {
    stubCookies("");
    stubFetch(new TypeError("Failed to fetch"));

    await expect(getCurrentUser()).rejects.toBeInstanceOf(
      SessionUnavailableError,
    );
  });
});

const DEACTIVATED_BODY = {
  statusCode: 403,
  code: "ACCOUNT_DEACTIVATED",
  message: "Tu cuenta está desactivada.",
};
const DEACTIVATED_HREF = `${ROUTES.LOGIN}?error=ACCOUNT_DEACTIVATED`;

function stubDeactivatedSession() {
  stubCookies("");
  stubCurrentPath("/dashboard");
  stubFetch(new Response(JSON.stringify(DEACTIVATED_BODY), { status: 403 }));
}

describe("a deactivated account", () => {
  it("getCurrentUser throws AccountDeactivatedError on 403 ACCOUNT_DEACTIVATED, which is still a SessionUnavailableError", async () => {
    stubDeactivatedSession();

    const error = await getCurrentUser().catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(AccountDeactivatedError);
    expect(error).toBeInstanceOf(SessionUnavailableError);
  });

  it("getCurrentUser still throws SessionUnavailableError on any other 403", async () => {
    stubCookies("");
    stubFetch(new Response(JSON.stringify({ statusCode: 403, code: "FORBIDDEN", message: "x" }), { status: 403 }));
    await expect(getCurrentUser()).rejects.not.toBeInstanceOf(AccountDeactivatedError);

    stubFetch(new Response("<html>Forbidden</html>", { status: 403 }));
    await expect(getCurrentUser()).rejects.toBeInstanceOf(SessionUnavailableError);
  });

  it.each([
    ["requireUser", () => requireUser()],
    ["requireRole", () => requireRole(USER_ROLES.STAFF)],
    ["requireIncompleteProfile", () => requireIncompleteProfile()],
  ])("sends a deactivated account to login with the error from %s", async (_name, run) => {
    stubDeactivatedSession();

    await expect(run()).rejects.toThrow(`REDIRECT:${DEACTIVATED_HREF}`);
    expect(redirectMock).toHaveBeenCalledWith(DEACTIVATED_HREF);
  });
});

describe("requireUser", () => {
  it("returns the user when there is a session", async () => {
    stubCookies("");
    stubFetch(new Response(JSON.stringify(user), { status: 200 }));

    await expect(requireUser()).resolves.toEqual(user);
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("redirects to /login when there is no session", async () => {
    stubCookies("");
    stubCurrentPath(null);
    stubFetch(new Response("{}", { status: 401 }));

    await expect(requireUser()).rejects.toThrow(`REDIRECT:${ROUTES.LOGIN}`);
    expect(redirectMock).toHaveBeenCalledWith(ROUTES.LOGIN);
  });

  it("sends the visitor back to the page they were on after signing in", async () => {
    stubCookies("");
    stubCurrentPath("/checkout/plan/123");
    stubFetch(new Response("{}", { status: 401 }));

    await expect(requireUser()).rejects.toThrow(
      `REDIRECT:${ROUTES.LOGIN}?redirectTo=%2Fcheckout%2Fplan%2F123`,
    );
  });

  it("sends a user without a phone to complete the profile", async () => {
    stubCookies("");
    stubCurrentPath(null);
    stubFetch(new Response(JSON.stringify(userWithoutPhone), { status: 200 }));

    await expect(requireUser()).rejects.toThrow(
      `REDIRECT:${ROUTES.COMPLETE_PROFILE}`,
    );
  });

  it("remembers the page a user without a phone was trying to reach", async () => {
    stubCookies("");
    stubCurrentPath("/history?tab=pagos");
    stubFetch(new Response(JSON.stringify(userWithoutPhone), { status: 200 }));

    await expect(requireUser()).rejects.toThrow(
      `REDIRECT:${ROUTES.COMPLETE_PROFILE}?redirectTo=${encodeURIComponent("/history?tab=pagos")}`,
    );
  });

  it("does not ask staff for a birth date", async () => {
    stubCookies("");
    stubFetch(new Response(JSON.stringify(staffUser), { status: 200 }));

    await expect(requireUser()).resolves.toEqual(staffUser);
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("sends a client with phone but no birth date to complete-profile", async () => {
    stubCookies("");
    stubCurrentPath(null);
    stubFetch(new Response(JSON.stringify(clientWithoutBirthDate), { status: 200 }));

    await expect(requireUser()).rejects.toThrow(
      `REDIRECT:${ROUTES.COMPLETE_PROFILE}`,
    );
  });

  it("lets SessionUnavailableError bubble up instead of redirecting", async () => {
    stubCookies("");
    stubFetch(new Response("{}", { status: 500 }));

    await expect(requireUser()).rejects.toBeInstanceOf(SessionUnavailableError);
    expect(redirectMock).not.toHaveBeenCalled();
  });
});

describe("requireRole", () => {
  it("returns the user when their role matches the page", async () => {
    stubCookies("");
    stubFetch(new Response(JSON.stringify(staffUser), { status: 200 }));

    await expect(requireRole(USER_ROLES.STAFF)).resolves.toEqual(staffUser);
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("sends a client who opens a staff page to their own profile", async () => {
    stubCookies("");
    stubFetch(new Response(JSON.stringify(user), { status: 200 }));

    await expect(requireRole(USER_ROLES.STAFF)).rejects.toThrow(
      `REDIRECT:${ROUTES.DASHBOARD}`,
    );
  });

  it("sends a staff user who opens a client page to the staff panel", async () => {
    stubCookies("");
    stubFetch(new Response(JSON.stringify(staffUser), { status: 200 }));

    await expect(requireRole(USER_ROLES.CLIENT)).rejects.toThrow(
      `REDIRECT:${ROUTES.STAFF}`,
    );
  });

  it("redirects to /login when there is no session", async () => {
    stubCookies("");
    stubCurrentPath(null);
    stubFetch(new Response("{}", { status: 401 }));

    await expect(requireRole(USER_ROLES.STAFF)).rejects.toThrow(
      `REDIRECT:${ROUTES.LOGIN}`,
    );
  });

  it("sends a user without a phone to complete the profile, even on their own area", async () => {
    stubCookies("");
    stubCurrentPath(null);
    stubFetch(new Response(JSON.stringify(userWithoutPhone), { status: 200 }));

    await expect(requireRole(USER_ROLES.CLIENT)).rejects.toThrow(
      `REDIRECT:${ROUTES.COMPLETE_PROFILE}`,
    );
  });

  it("lets SessionUnavailableError bubble up instead of redirecting", async () => {
    stubCookies("");
    stubFetch(new Response("{}", { status: 500 }));

    await expect(requireRole(USER_ROLES.STAFF)).rejects.toBeInstanceOf(
      SessionUnavailableError,
    );
    expect(redirectMock).not.toHaveBeenCalled();
  });
});

describe("requireIncompleteProfile", () => {
  it("returns the user while something is missing", async () => {
    stubCookies("");
    stubFetch(new Response(JSON.stringify(userWithoutPhone), { status: 200 }));

    await expect(requireIncompleteProfile()).resolves.toEqual(userWithoutPhone);
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("sends a user with a complete profile to their own area", async () => {
    stubCookies("");
    stubFetch(new Response(JSON.stringify(staffUser), { status: 200 }));

    await expect(requireIncompleteProfile()).rejects.toThrow(
      `REDIRECT:${ROUTES.STAFF}`,
    );
  });

  it("redirects to /login when there is no session", async () => {
    stubCookies("");
    stubCurrentPath(null);
    stubFetch(new Response("{}", { status: 401 }));

    await expect(requireIncompleteProfile()).rejects.toThrow(
      `REDIRECT:${ROUTES.LOGIN}`,
    );
  });

  it("returns a client who only lacks the birth date", async () => {
    stubCookies("");
    stubFetch(new Response(JSON.stringify(clientWithoutBirthDate), { status: 200 }));

    await expect(requireIncompleteProfile()).resolves.toEqual(clientWithoutBirthDate);
  });

  it("sends a client with everything to their home", async () => {
    stubCookies("");
    stubFetch(new Response(JSON.stringify(user), { status: 200 }));

    await expect(requireIncompleteProfile()).rejects.toThrow(
      `REDIRECT:${ROUTES.DASHBOARD}`,
    );
  });
});
