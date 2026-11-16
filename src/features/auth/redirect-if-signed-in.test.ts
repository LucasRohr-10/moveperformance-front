// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

const redirectMock = vi.hoisted(() =>
  vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
);

vi.mock("next/navigation", () => ({ redirect: redirectMock }));
vi.mock("@/lib/session", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/session")>()),
  getCurrentUser: vi.fn(),
}));

import { ROUTES } from "@/config/constants/routes.constants";
import { USER_ROLES } from "@/config/constants/user-roles.constants";
import {
  type AuthenticatedUser,
  getCurrentUser,
  AccountDeactivatedError,
  SessionUnavailableError,
} from "@/lib/session";

import { RedirectIfSignedIn } from "./redirect-if-signed-in";

const getCurrentUserMock = vi.mocked(getCurrentUser);

const user: AuthenticatedUser = {
  id: "1",
  name: "Ana",
  lastName: "Perez",
  email: "ana@move.uy",
  phone: "+59899123456",
  birthDate: "1990-03-12",
  role: USER_ROLES.CLIENT,
};

afterEach(() => {
  vi.clearAllMocks();
});

describe("RedirectIfSignedIn", () => {
  it("sends a signed-in client to their profile", async () => {
    getCurrentUserMock.mockResolvedValue(user);

    await expect(RedirectIfSignedIn()).rejects.toThrow(
      `REDIRECT:${ROUTES.DASHBOARD}`,
    );
  });

  it("sends a signed-in staff user to the staff panel", async () => {
    getCurrentUserMock.mockResolvedValue({ ...user, role: USER_ROLES.STAFF });

    await expect(RedirectIfSignedIn()).rejects.toThrow(
      `REDIRECT:${ROUTES.STAFF}`,
    );
  });

  it("renders nothing and lets the page show when there is no session", async () => {
    getCurrentUserMock.mockResolvedValue(null);

    await expect(RedirectIfSignedIn()).resolves.toBeNull();
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("lets the page show when the API is down instead of failing", async () => {
    getCurrentUserMock.mockRejectedValue(new SessionUnavailableError());

    await expect(RedirectIfSignedIn()).resolves.toBeNull();
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("shows the login form for a deactivated account", async () => {
    getCurrentUserMock.mockRejectedValue(new AccountDeactivatedError());

    await expect(RedirectIfSignedIn()).resolves.toBeNull();
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("does not hide unexpected errors", async () => {
    const bug = new TypeError("boom");
    getCurrentUserMock.mockRejectedValue(bug);

    await expect(RedirectIfSignedIn()).rejects.toBe(bug);
  });
});
