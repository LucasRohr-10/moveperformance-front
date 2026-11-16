import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { renderWithSnackbar } from "@/test/render-with-snackbar";

import type { AuthenticatedUser } from "@/lib/session";

vi.mock("@/lib/session", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/session")>()),
  getCurrentUser: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }),
}));

import { getCurrentUser, SessionUnavailableError } from "@/lib/session";

import { AvatarSlotContent } from "./avatar-slot";

const getCurrentUserMock = vi.mocked(getCurrentUser);

describe("AvatarSlotContent", () => {
  it("renders the avatar menu when there is a signed-in user", async () => {
    const user: AuthenticatedUser = {
      id: "1",
      name: "Ana",
      lastName: "Perez",
      email: "ana@move.uy",
      phone: "+59899123456",
      birthDate: "1990-03-12",
      role: "client",
    };
    getCurrentUserMock.mockResolvedValue(user);

    renderWithSnackbar(await AvatarSlotContent());

    expect(
      screen.getByRole("button", { name: "Cuenta de Ana" }),
    ).toBeDefined();
  });

  it("renders a neutral avatar without crashing when there is no session", async () => {
    getCurrentUserMock.mockResolvedValue(null);

    renderWithSnackbar(await AvatarSlotContent());

    expect(screen.queryByRole("button", { name: /^Cuenta de/ })).toBeNull();
  });

  it("renders a neutral avatar without crashing when the backend is unavailable", async () => {
    getCurrentUserMock.mockRejectedValue(new SessionUnavailableError());

    renderWithSnackbar(await AvatarSlotContent());

    expect(screen.queryByRole("button", { name: /^Cuenta de/ })).toBeNull();
  });
});
