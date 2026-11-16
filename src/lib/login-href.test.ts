// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

const headersMock = vi.hoisted(() => vi.fn());

vi.mock("next/headers", () => ({ headers: headersMock }));

import { ROUTES } from "@/config/constants/routes.constants";
import { CURRENT_PATH_HEADER } from "@/lib/current-path-header";

import { buildLoginHref } from "./login-href";

function stubCurrentPath(value: string | null) {
  headersMock.mockResolvedValue({ get: (name: string) => (name === CURRENT_PATH_HEADER ? value : null) });
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("buildLoginHref", () => {
  it("plain /login when there is no current-path header", async () => {
    stubCurrentPath(null);
    await expect(buildLoginHref()).resolves.toBe(ROUTES.LOGIN);
  });

  it("attaches the current path as redirectTo", async () => {
    stubCurrentPath("/checkout/plan/123");
    await expect(buildLoginHref()).resolves.toBe(`${ROUTES.LOGIN}?redirectTo=%2Fcheckout%2Fplan%2F123`);
  });

  it("preserves the current path's own query string", async () => {
    stubCurrentPath("/planes?service=rehab");
    await expect(buildLoginHref()).resolves.toBe(
      `${ROUTES.LOGIN}?redirectTo=${encodeURIComponent("/planes?service=rehab")}`,
    );
  });

  it("falls back to plain /login when the current path is itself an auth page", async () => {
    stubCurrentPath(ROUTES.REGISTER);
    await expect(buildLoginHref()).resolves.toBe(ROUTES.LOGIN);
  });
});
