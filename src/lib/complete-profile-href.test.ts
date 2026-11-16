// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

const headersMock = vi.hoisted(() => vi.fn());

vi.mock("next/headers", () => ({ headers: headersMock }));

import { ROUTES } from "@/config/constants/routes.constants";
import { CURRENT_PATH_HEADER } from "@/lib/current-path-header";

import { buildCompleteProfileHref } from "./complete-profile-href";

function stubCurrentPath(value: string | null) {
  headersMock.mockResolvedValue({ get: (name: string) => (name === CURRENT_PATH_HEADER ? value : null) });
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("buildCompleteProfileHref", () => {
  it("plain /complete-profile when there is no current-path header", async () => {
    stubCurrentPath(null);
    await expect(buildCompleteProfileHref()).resolves.toBe(ROUTES.COMPLETE_PROFILE);
  });

  it("attaches the current path as redirectTo", async () => {
    stubCurrentPath("/history?tab=pagos");
    await expect(buildCompleteProfileHref()).resolves.toBe(
      `${ROUTES.COMPLETE_PROFILE}?redirectTo=${encodeURIComponent("/history?tab=pagos")}`,
    );
  });

  it("falls back to plain /complete-profile when the current path is unsafe", async () => {
    stubCurrentPath("/\t/evil.com");
    await expect(buildCompleteProfileHref()).resolves.toBe(ROUTES.COMPLETE_PROFILE);
  });

  it("falls back to plain /complete-profile when the current path is an auth page", async () => {
    stubCurrentPath(ROUTES.LOGIN);
    await expect(buildCompleteProfileHref()).resolves.toBe(ROUTES.COMPLETE_PROFILE);
  });
});
