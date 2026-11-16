import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AuthenticatedUser } from "@/lib/session";
import { renderWithSnackbar } from "@/test/render-with-snackbar";

vi.mock("@/lib/session", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/session")>()),
  getCurrentUser: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }),
}));

const currentPath = vi.hoisted<{ current: string | null }>(() => ({ current: null }));

vi.mock("next/headers", () => ({
  headers: () => Promise.resolve({ get: () => currentPath.current }),
}));

import { getCurrentUser, SessionUnavailableError } from "@/lib/session";

import { PublicNavActionsContent } from "./public-nav-actions";

const getCurrentUserMock = vi.mocked(getCurrentUser);

const clientUser: AuthenticatedUser = {
  id: "1",
  name: "Ana",
  lastName: "Perez",
  email: "ana@move.uy",
  phone: "+59899123456",
  birthDate: "1990-03-12",
  role: "client",
};

const staffUser: AuthenticatedUser = {
  id: "2",
  name: "Juan",
  lastName: "Pereira",
  email: "juan@move.uy",
  phone: "+59894555555",
  birthDate: null,
  role: "staff",
};

describe("PublicNavActionsContent", () => {
  beforeEach(() => {
    currentPath.current = null;
  });

  it("shows the account menu with a way back to the profile for a signed-in client, and hides Reservar", async () => {
    getCurrentUserMock.mockResolvedValue(clientUser);

    renderWithSnackbar(await PublicNavActionsContent());
    expect(screen.queryByRole("link", { name: "Ingresar" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Reservar" })).toBeNull();

    await userEvent.click(screen.getByRole("button", { name: "Cuenta de Ana" }));

    expect(
      screen.getByRole("menuitem", { name: "Mi perfil" }).getAttribute("href"),
    ).toBe("/dashboard");
  });

  it("shows the account menu with a way back to the staff area for a signed-in staff member, and hides Reservar", async () => {
    getCurrentUserMock.mockResolvedValue(staffUser);

    renderWithSnackbar(await PublicNavActionsContent());
    expect(screen.queryByRole("link", { name: "Reservar" })).toBeNull();

    await userEvent.click(screen.getByRole("button", { name: "Cuenta de Juan" }));

    expect(
      screen.getByRole("menuitem", { name: "Ir a Staff" }).getAttribute("href"),
    ).toBe("/staff");
  });

  it("shows the sign-in CTA when there is no session", async () => {
    getCurrentUserMock.mockResolvedValue(null);

    renderWithSnackbar(await PublicNavActionsContent());

    expect(
      screen.getByRole("link", { name: "Ingresar" }).getAttribute("href"),
    ).toBe("/login");
  });

  it("falls back to the sign-in CTA when the backend is unavailable", async () => {
    getCurrentUserMock.mockRejectedValue(new SessionUnavailableError());

    renderWithSnackbar(await PublicNavActionsContent());

    expect(
      screen.getByRole("link", { name: "Ingresar" }).getAttribute("href"),
    ).toBe("/login");
  });

  it("sends the sign-in CTA to the bare login even from another public page, so signing in lands on the account area", async () => {
    getCurrentUserMock.mockResolvedValue(null);
    currentPath.current = "/planes";

    renderWithSnackbar(await PublicNavActionsContent());

    expect(
      screen.getByRole("link", { name: "Ingresar" }).getAttribute("href"),
    ).toBe("/login");
  });
});
