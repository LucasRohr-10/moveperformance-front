import { describe, expect, it, vi } from "vitest";

import type { AuthenticatedUser } from "@/lib/session";

vi.mock("@/lib/session", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/session")>()),
  getCurrentUser: vi.fn(),
}));

import { getCurrentUser, SessionUnavailableError } from "@/lib/session";

import { BirthdayCelebration } from "./birthday-celebration";
import { BirthdaySlot } from "./birthday-slot";

const getCurrentUserMock = vi.mocked(getCurrentUser);

const client: AuthenticatedUser = {
  id: "u1",
  name: "Ana",
  lastName: "Perez",
  email: "ana@move.uy",
  phone: "+59899123456",
  birthDate: "1990-11-04",
  role: "client",
};

describe("BirthdaySlot", () => {
  it("renders the celebration for a client with a birth date", async () => {
    getCurrentUserMock.mockResolvedValue(client);

    const element = await BirthdaySlot();

    expect(element).toEqual(
      <BirthdayCelebration userId="u1" firstName="Ana" birthDate="1990-11-04" />,
    );
  });

  it.each([
    ["staff", { ...client, role: "staff" as const }],
    ["a user without birth date", { ...client, birthDate: null }],
    ["no session", null],
  ])("renders nothing for %s", async (_label, user) => {
    getCurrentUserMock.mockResolvedValue(user);

    expect(await BirthdaySlot()).toBeNull();
  });

  it("renders nothing when the session cannot be checked", async () => {
    getCurrentUserMock.mockRejectedValue(new SessionUnavailableError());

    expect(await BirthdaySlot()).toBeNull();
  });
});
