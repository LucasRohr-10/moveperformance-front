import { describe, expect, it } from "vitest";

import { getPasswordChecks } from "./password-strength";

describe("getPasswordChecks", () => {
  it("fails every check for an empty password", () => {
    expect(getPasswordChecks("")).toEqual([
      { label: "8+ caracteres", ok: false },
      { label: "Una mayúscula", ok: false },
      { label: "Un número", ok: false },
      { label: "Un símbolo", ok: false },
    ]);
  });

  it("passes every check for a strong password", () => {
    const checks = getPasswordChecks("Abcdef1!");
    expect(checks.every((check) => check.ok)).toBe(true);
  });

  it("only flags the criteria actually met", () => {
    const checks = getPasswordChecks("abcdefgh");
    expect(checks).toEqual([
      { label: "8+ caracteres", ok: true },
      { label: "Una mayúscula", ok: false },
      { label: "Un número", ok: false },
      { label: "Un símbolo", ok: false },
    ]);
  });
});
