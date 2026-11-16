import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { renderWithSnackbar } from "@/test/render-with-snackbar";

import { USER_ROLES } from "@/config/constants/user-roles.constants";
import type { AuthenticatedUser } from "@/lib/session";

vi.mock("@/lib/session", () => ({ requireRole: vi.fn() }));
vi.mock("@/features/clients/staff/clients-filters", () => ({
  ClientsFilters: ({ params }: { params: { q: string; status: string; expiringSoon: boolean } }) => (
    <div data-testid="clients-filters">
      {params.status}/{params.q}/{String(params.expiringSoon)}
    </div>
  ),
}));
vi.mock("@/features/clients/staff/clients-list-section", () => ({
  ClientsListSection: ({ params }: { params: { page: number } }) => (
    <div data-testid="clients-list">page {params.page}</div>
  ),
}));

import { requireRole } from "@/lib/session";

import { StaffClientsContent } from "./page";

const requireRoleMock = vi.mocked(requireRole);

const STAFF: AuthenticatedUser = {
  id: "2",
  name: "Juan",
  lastName: "Pereira",
  email: "juan@move.uy",
  phone: "+59899765432",
  birthDate: null,
  role: USER_ROLES.STAFF,
};

describe("StaffClientsContent", () => {
  it("is reserved for staff and shows the filters and the list", async () => {
    requireRoleMock.mockResolvedValue(STAFF);

    renderWithSnackbar(await StaffClientsContent({ searchParams: Promise.resolve({}) }));

    expect(requireRoleMock).toHaveBeenCalledWith(USER_ROLES.STAFF);
    expect(screen.getByRole("heading", { level: 1, name: "Clientes" })).toBeDefined();
    expect(screen.getByTestId("clients-filters").textContent).toBe("active//false");
    expect(screen.getByTestId("clients-list").textContent).toBe("page 1");
  });

  it("reads the filter, the search and the page from the URL", async () => {
    requireRoleMock.mockResolvedValue(STAFF);

    renderWithSnackbar(
      await StaffClientsContent({ searchParams: Promise.resolve({ status: "deactivated", q: "ana", page: "2" }) }),
    );

    expect(screen.getByTestId("clients-filters").textContent).toBe("deactivated/ana/false");
    expect(screen.getByTestId("clients-list").textContent).toBe("page 2");
  });

  it("passes the filter from the URL", async () => {
    requireRoleMock.mockResolvedValue(STAFF);

    renderWithSnackbar(await StaffClientsContent({ searchParams: Promise.resolve({ vence: "pronto" }) }));

    expect(screen.getByTestId("clients-filters").textContent).toBe("active//true");
  });

  it("offers Nuevo cliente in the header", async () => {
    requireRoleMock.mockResolvedValue(STAFF);

    renderWithSnackbar(await StaffClientsContent({ searchParams: Promise.resolve({}) }));

    expect(screen.getByRole("link", { name: "Nuevo cliente" }).getAttribute("href")).toBe("/staff/clients/new");
  });
});
