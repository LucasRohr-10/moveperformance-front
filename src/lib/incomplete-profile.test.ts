// @vitest-environment node
import { describe, expect, it } from "vitest";

import type { AuthenticatedUser } from "@/lib/api/types";

import { hasIncompleteProfile, missingProfileFields } from "./incomplete-profile";

const client: AuthenticatedUser = {
  id: "1",
  name: "Ana",
  lastName: "Perez",
  email: "ana@move.uy",
  phone: "+59899123456",
  birthDate: "1990-03-12",
  role: "client",
};

const staff: AuthenticatedUser = { ...client, id: "2", role: "staff" };

describe("missingProfileFields", () => {
  it.each([
    ["a complete client", client, { phone: false, birthDate: false }],
    ["a client without phone", { ...client, phone: null }, { phone: true, birthDate: false }],
    ["a client without birth date", { ...client, birthDate: null }, { phone: false, birthDate: true }],
    ["a client without both", { ...client, phone: null, birthDate: null }, { phone: true, birthDate: true }],
    ["staff without birth date", { ...staff, birthDate: null }, { phone: false, birthDate: false }],
    ["staff without phone nor birth date", { ...staff, phone: null, birthDate: null }, { phone: true, birthDate: false }],
  ])("%s", (_label, user, expected) => {
    expect(missingProfileFields(user)).toEqual(expected);
    expect(hasIncompleteProfile(user)).toBe(expected.phone || expected.birthDate);
  });
});
