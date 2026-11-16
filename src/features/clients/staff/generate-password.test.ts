// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

import { getPasswordChecks } from "@/features/auth/password-strength";

import { GENERATED_PASSWORD_LENGTH, generatePassword } from "./generate-password";

const ROUNDS = 500;

afterEach(() => vi.restoreAllMocks());

describe("generatePassword", () => {
  it("always has 12 characters with an uppercase, a lowercase, a digit and a symbol", () => {
    for (let round = 0; round < ROUNDS; round += 1) {
      const password = generatePassword();

      expect(password).toHaveLength(GENERATED_PASSWORD_LENGTH);
      expect(password).toMatch(/[A-Z]/);
      expect(password).toMatch(/[a-z]/);
      expect(password).toMatch(/\d/);
      expect(password).toMatch(/[^A-Za-z0-9]/);
    }
  });

  it("passes the four registration hints", () => {
    for (let round = 0; round < ROUNDS; round += 1) {
      expect(getPasswordChecks(generatePassword()).every((check) => check.ok)).toBe(true);
    }
  });

  it("never uses look-alike characters", () => {
    for (let round = 0; round < ROUNDS; round += 1) {
      expect(generatePassword()).not.toMatch(/[IOl01]/);
    }
  });

  it("draws from crypto.getRandomValues", () => {
    const spy = vi.spyOn(crypto, "getRandomValues");

    generatePassword();

    expect(spy).toHaveBeenCalled();
  });

  it("differs between calls", () => {
    const passwords = new Set(Array.from({ length: 100 }, () => generatePassword()));

    expect(passwords.size).toBe(100);
  });
});
