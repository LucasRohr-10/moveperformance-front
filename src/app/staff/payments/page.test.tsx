import { cleanup, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithSnackbar } from "@/test/render-with-snackbar";

import { USER_ROLES } from "@/config/constants/user-roles.constants";
import type { AuthenticatedUser } from "@/lib/session";

vi.mock("@/lib/session", () => ({
  requireRole: vi.fn(),
}));
vi.mock("@/features/payments/staff", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/features/payments/staff")>()),
  StaffPaymentsPanel: ({
    filter,
    page,
    view,
    overdueOnly,
    todayOnly,
  }: {
    filter: Record<string, unknown>;
    page: number;
    view: string;
    overdueOnly?: boolean;
    todayOnly?: boolean;
  }) => <div data-testid="payments-panel">{JSON.stringify({ filter, page, view, overdueOnly, todayOnly })}</div>,
}));

import { requireRole } from "@/lib/session";

import { StaffPaymentsContent } from "./page";

const requireRoleMock = vi.mocked(requireRole);

const staff: AuthenticatedUser = {
  id: "2",
  name: "Juan Pereira",
  lastName: "Pereira",
  email: "juan@move.uy",
  phone: "+59899765432",
  birthDate: null,
  role: USER_ROLES.STAFF,
};

const searchParams = (query: Record<string, string> = {}) => Promise.resolve(query);

describe("StaffPaymentsContent", () => {
  beforeEach(() => {
    requireRoleMock.mockReset();
    requireRoleMock.mockResolvedValue(staff);
  });

  it("is reserved for staff and renders the panel with no filters on page 1", async () => {
    renderWithSnackbar(await StaffPaymentsContent({ searchParams: searchParams() }));

    expect(requireRoleMock).toHaveBeenCalledWith(USER_ROLES.STAFF);
    expect(screen.getByRole("heading", { level: 1, name: "Pagos" })).toBeDefined();
    expect(JSON.parse(screen.getByTestId("payments-panel").textContent ?? "{}")).toEqual({
      filter: {},
      page: 1,
      view: "all",
    });
  });

  it("reads valid filters and the page from the URL", async () => {
    renderWithSnackbar(
      await StaffPaymentsContent({
        searchParams: searchParams({
          status: "rejected",
          kind: "plan",
          origin: "auto_debit",
          needsAttention: "true",
          page: "3",
        }),
      }),
    );

    expect(JSON.parse(screen.getByTestId("payments-panel").textContent ?? "{}")).toEqual({
      filter: { status: "rejected", kind: "plan", origin: "auto_debit", needsAttention: true },
      page: 3,
      view: "all",
    });
  });

  it("reads clientId from the URL, as the client detail page's 'Ver pagos' link sets it", async () => {
    renderWithSnackbar(
      await StaffPaymentsContent({
        searchParams: searchParams({ clientId: "client-1" }),
      }),
    );

    expect(JSON.parse(screen.getByTestId("payments-panel").textContent ?? "{}")).toEqual({
      filter: { clientId: "client-1" },
      page: 1,
      view: "all",
    });
  });

  it("drops unknown filter values and an invalid page", async () => {
    renderWithSnackbar(
      await StaffPaymentsContent({
        searchParams: searchParams({ status: "cualquiera", page: "-1" }),
      }),
    );

    expect(JSON.parse(screen.getByTestId("payments-panel").textContent ?? "{}")).toEqual({
      filter: {},
      page: 1,
      view: "all",
    });
  });

  it("reads view=to-collect and ignores unknown views", async () => {
    renderWithSnackbar(await StaffPaymentsContent({ searchParams: searchParams({ view: "to-collect" }) }));
    expect(JSON.parse(screen.getByTestId("payments-panel").textContent ?? "{}")).toEqual({
      filter: {},
      page: 1,
      view: "to-collect",
    });

    cleanup();
    renderWithSnackbar(await StaffPaymentsContent({ searchParams: searchParams({ view: "cualquiera" }) }));
    expect(JSON.parse(screen.getByTestId("payments-panel").textContent ?? "{}")).toEqual({
      filter: {},
      page: 1,
      view: "all",
    });
  });

  it("passes the filter from the URL", async () => {
    renderWithSnackbar(
      await StaffPaymentsContent({ searchParams: searchParams({ view: "to-collect", atrasados: "true" }) }),
    );

    expect(JSON.parse(screen.getByTestId("payments-panel").textContent ?? "{}")).toEqual({
      filter: {},
      page: 1,
      view: "to-collect",
      overdueOnly: true,
    });
  });

  it("reads dia=hoy as the today filter", async () => {
    renderWithSnackbar(await StaffPaymentsContent({ searchParams: searchParams({ view: "to-collect", dia: "hoy" }) }));

    expect(JSON.parse(screen.getByTestId("payments-panel").textContent ?? "{}")).toEqual({
      filter: {},
      page: 1,
      view: "to-collect",
      todayOnly: true,
    });
  });

  it("ignores a dia it does not know", async () => {
    renderWithSnackbar(await StaffPaymentsContent({ searchParams: searchParams({ view: "to-collect", dia: "ayer" }) }));

    expect(JSON.parse(screen.getByTestId("payments-panel").textContent ?? "{}").todayOnly).toBeUndefined();
  });

  it("keeps atrasados and drops dia=hoy when the URL asks for both", async () => {
    renderWithSnackbar(
      await StaffPaymentsContent({
        searchParams: searchParams({ view: "to-collect", atrasados: "true", dia: "hoy" }),
      }),
    );

    const panel = JSON.parse(screen.getByTestId("payments-panel").textContent ?? "{}");
    expect(panel.overdueOnly).toBe(true);
    expect(panel.todayOnly).toBeUndefined();
  });

  it("ignores atrasados when it is not true", async () => {
    renderWithSnackbar(
      await StaffPaymentsContent({ searchParams: searchParams({ view: "to-collect", atrasados: "si" }) }),
    );

    expect(JSON.parse(screen.getByTestId("payments-panel").textContent ?? "{}").overdueOnly).toBeUndefined();
  });
});
