import { describe, expect, it } from "vitest";

import { ROUTES } from "@/config/constants/routes.constants";

import { safeRedirectPath } from "./redirect-path";

describe("safeRedirectPath", () => {
  it("accepts a plain internal path", () => {
    expect(safeRedirectPath("/checkout/plan/123")).toBe("/checkout/plan/123");
  });

  it("accepts an internal path with a query string", () => {
    expect(safeRedirectPath("/planes?service=rehab")).toBe("/planes?service=rehab");
  });

  it("rejects null and empty values", () => {
    expect(safeRedirectPath(null)).toBeNull();
    expect(safeRedirectPath(undefined)).toBeNull();
    expect(safeRedirectPath("")).toBeNull();
  });

  it("rejects a value that is not a path", () => {
    expect(safeRedirectPath("checkout/plan/123")).toBeNull();
  });

  it("rejects a protocol-relative URL (open redirect)", () => {
    expect(safeRedirectPath("//evil.com")).toBeNull();
  });

  it("rejects a backslash trick that browsers normalize to protocol-relative", () => {
    expect(safeRedirectPath("/\\evil.com")).toBeNull();
  });

  it("rejects a tab or newline after the first slash, which browsers strip to leave //evil.com", () => {
    expect(safeRedirectPath("/\t/evil.com")).toBeNull();
    expect(safeRedirectPath("/\n/evil.com")).toBeNull();
    expect(safeRedirectPath("/\r/evil.com")).toBeNull();
  });

  it("rejects a backslash anywhere in the path", () => {
    expect(safeRedirectPath("/plans\\evil.com")).toBeNull();
  });

  it("rejects any control character, even deep in the path or query", () => {
    expect(safeRedirectPath("/plans?service=a\u0000b")).toBeNull();
    expect(safeRedirectPath("/plans\u007f")).toBeNull();
  });

  it("rejects a javascript: URL", () => {
    expect(safeRedirectPath("javascript:alert(1)")).toBeNull();
  });

  it("rejects an absolute URL", () => {
    expect(safeRedirectPath("https://evil.com")).toBeNull();
  });

  it("rejects the login page itself, to avoid a redirect loop", () => {
    expect(safeRedirectPath(ROUTES.LOGIN)).toBeNull();
  });

  it("rejects the other auth pages, which are never useful landing spots after signing in", () => {
    expect(safeRedirectPath(ROUTES.REGISTER)).toBeNull();
    expect(safeRedirectPath(ROUTES.FORGOT_PASSWORD)).toBeNull();
    expect(safeRedirectPath(ROUTES.RESET_PASSWORD)).toBeNull();
    expect(safeRedirectPath(ROUTES.VERIFY_EMAIL)).toBeNull();
    expect(safeRedirectPath(ROUTES.COMPLETE_PROFILE)).toBeNull();
  });
});
