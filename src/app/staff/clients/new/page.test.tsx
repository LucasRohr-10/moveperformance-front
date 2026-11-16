import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { renderWithSnackbar } from "@/test/render-with-snackbar";

import { USER_ROLES } from "@/config/constants/user-roles.constants";
import type { AuthenticatedUser } from "@/lib/session";

vi.mock("@/lib/session", () => ({ requireRole: vi.fn() }));
vi.mock("@/features/clients/staff/new-client-form", () => ({
  NewClientForm: () => <div data-testid="new-client-form" />,
}));

import { requireRole } from "@/lib/session";

import { NewClientContent } from "./page";

const requireRoleMock = vi.mocked(requireRole);

const staff: AuthenticatedUser = {
  id: "2",
  name: "Juan",
  lastName: "Pereira",
  email: "juan@move.uy",
  phone: "+59899123456",
  birthDate: null,
  role: USER_ROLES.STAFF,
};

describe("NewClientContent", () => {
  it("is reserved for staff and shows the form", async () => {
    requireRoleMock.mockResolvedValue(staff);

    renderWithSnackbar(await NewClientContent());

    expect(requireRoleMock).toHaveBeenCalledWith(USER_ROLES.STAFF);
    expect(screen.getByRole("heading", { level: 1, name: "Nuevo cliente" })).toBeDefined();
    expect(screen.getByRole("link", { name: "Clientes" }).getAttribute("href")).toBe("/staff/clients");
    expect(screen.getByTestId("new-client-form")).toBeDefined();
  });

  it("shows nothing when the role check redirects", async () => {
    requireRoleMock.mockRejectedValue(new Error("NEXT_REDIRECT"));

    await expect(NewClientContent()).rejects.toThrow("NEXT_REDIRECT");
  });
});
