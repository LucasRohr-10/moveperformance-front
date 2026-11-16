import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { USER_ROLES } from "@/config/constants/user-roles.constants";
import type { AuthenticatedUser } from "@/lib/session";

vi.mock("@/lib/session", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/session")>("@/lib/session");
  return {
    ...actual,
    getCurrentUser: vi.fn(),
  };
});

import { getCurrentUser, SessionUnavailableError } from "@/lib/session";

import { RoleGatedShellContent } from "./role-gated-shell";

const getCurrentUserMock = vi.mocked(getCurrentUser);

const clientUser: AuthenticatedUser = {
  id: "1",
  name: "Ana Perez",
  lastName: "Perez",
  email: "ana@move.uy",
  phone: "+59899123456",
  birthDate: "1990-03-12",
  role: USER_ROLES.CLIENT,
};

const staffUser: AuthenticatedUser = {
  id: "2",
  name: "Juan Pereira",
  lastName: "Pereira",
  email: "juan@move.uy",
  phone: "+59899765432",
  birthDate: null,
  role: USER_ROLES.STAFF,
};

describe("RoleGatedShellContent", () => {
  it("renders the shell when the signed-in user's role matches", async () => {
    getCurrentUserMock.mockResolvedValue(staffUser);

    render(
      await RoleGatedShellContent({
        role: USER_ROLES.STAFF,
        shell: (content) => <nav data-testid="shell">{content}</nav>,
        children: <p>page content</p>,
      }),
    );

    expect(screen.getByTestId("shell")).toBeDefined();
    expect(screen.getByText("page content")).toBeDefined();
  });

  it("shows only the neutral spinner when the signed-in user's role doesn't match, hiding children instead of exposing their heading/skeleton", async () => {
    getCurrentUserMock.mockResolvedValue(clientUser);

    render(
      await RoleGatedShellContent({
        role: USER_ROLES.STAFF,
        shell: (content) => <nav data-testid="shell">{content}</nav>,
        children: <p>page content</p>,
      }),
    );

    expect(screen.queryByTestId("shell")).toBeNull();
    expect(screen.getByRole("status")).toBeDefined();
    const content = screen.getByText("page content");
    expect(content.closest("[hidden]")).not.toBeNull();
  });

  it("shows only the neutral spinner when there is no session, hiding children instead of exposing their heading/skeleton", async () => {
    getCurrentUserMock.mockResolvedValue(null);

    render(
      await RoleGatedShellContent({
        role: USER_ROLES.STAFF,
        shell: (content) => <nav data-testid="shell">{content}</nav>,
        children: <p>page content</p>,
      }),
    );

    expect(screen.queryByTestId("shell")).toBeNull();
    expect(screen.getByRole("status")).toBeDefined();
    const content = screen.getByText("page content");
    expect(content.closest("[hidden]")).not.toBeNull();
  });

  it("treats a down backend as a role mismatch instead of crashing, still hiding children behind the spinner", async () => {
    getCurrentUserMock.mockRejectedValue(new SessionUnavailableError());

    render(
      await RoleGatedShellContent({
        role: USER_ROLES.STAFF,
        shell: (content) => <nav data-testid="shell">{content}</nav>,
        children: <p>page content</p>,
      }),
    );

    expect(screen.queryByTestId("shell")).toBeNull();
    expect(screen.getByRole("status")).toBeDefined();
    const content = screen.getByText("page content");
    expect(content.closest("[hidden]")).not.toBeNull();
  });
});
