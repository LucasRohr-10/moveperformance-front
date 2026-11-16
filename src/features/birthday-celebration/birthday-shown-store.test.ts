import { afterEach, describe, expect, it, vi } from "vitest";

import { hasShownBirthday, markBirthdayShown } from "./birthday-shown-store";

afterEach(() => {
  vi.restoreAllMocks();
  window.localStorage.clear();
});

describe("birthday shown store", () => {
  it("remembers the celebration per user and year", () => {
    expect(hasShownBirthday("u1", "2026")).toBe(false);

    markBirthdayShown("u1", "2026");

    expect(hasShownBirthday("u1", "2026")).toBe(true);
    expect(window.localStorage.getItem("move:birthday-shown:u1:2026")).not.toBeNull();
    expect(hasShownBirthday("u1", "2027")).toBe(false);
    expect(hasShownBirthday("u2", "2026")).toBe(false);
  });

  it("answers false without breaking when storage throws", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("denied");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("denied");
    });

    expect(() => markBirthdayShown("u1", "2026")).not.toThrow();
    expect(hasShownBirthday("u1", "2026")).toBe(false);
  });
});
