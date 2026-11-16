import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithSnackbar } from "@/test/render-with-snackbar";

import { USER_ROLES } from "@/config/constants/user-roles.constants";
import type { AuthenticatedUser } from "@/lib/session";

vi.mock("@/lib/session", () => ({
  requireRole: vi.fn(),
}));
vi.mock("@/features/payment-history", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/features/payment-history")>()),
  PaymentHistorySection: ({ origin, page }: { origin?: string; page: number }) => (
    <div data-testid="payments-section">{JSON.stringify({ origin: origin ?? null, page })}</div>
  ),
}));
vi.mock("@/features/attendance-history", () => ({
  AttendanceHistorySection: ({ page, hrefForPage }: { page: number; hrefForPage: (page: number) => string }) => (
    <div data-testid="attendance-section">{JSON.stringify({ page, next: hrefForPage(page + 1) })}</div>
  ),
}));

import { requireRole } from "@/lib/session";

import { HistoryContent } from "./page";

const requireRoleMock = vi.mocked(requireRole);

const client: AuthenticatedUser = {
  id: "1",
  name: "Ana Perez",
  lastName: "Perez",
  email: "ana@move.uy",
  phone: "+59899123456",
  birthDate: "1990-03-12",
  role: USER_ROLES.CLIENT,
};

const searchParams = (query: Record<string, string> = {}) => Promise.resolve(query);
const propsOf = (testId: string) => JSON.parse(screen.getByTestId(testId).textContent ?? "{}");

describe("HistoryContent", () => {
  beforeEach(() => {
    requireRoleMock.mockReset();
    requireRoleMock.mockResolvedValue(client);
  });

  it("is reserved for clients and opens on the Asistencia tab under the Actividad heading", async () => {
    renderWithSnackbar(await HistoryContent({ searchParams: searchParams() }));

    expect(requireRoleMock).toHaveBeenCalledWith(USER_ROLES.CLIENT);
    expect(screen.getByRole("heading", { level: 1, name: "Actividad" })).toBeDefined();
    expect(screen.getByRole("link", { name: "Asistencia" }).getAttribute("aria-current")).toBe("page");
    expect(propsOf("attendance-section")).toEqual({ page: 1, next: "/history?page=2" });
    expect(screen.queryByTestId("payments-section")).toBeNull();
  });

  it("shows the payments with the origin and page of the URL when the tab is pagos", async () => {
    renderWithSnackbar(
      await HistoryContent({ searchParams: searchParams({ tab: "pagos", origin: "auto_debit", page: "2" }) }),
    );

    expect(screen.getByRole("link", { name: "Pagos" }).getAttribute("aria-current")).toBe("page");
    expect(propsOf("payments-section")).toEqual({ origin: "auto_debit", page: 2 });
    expect(screen.queryByTestId("attendance-section")).toBeNull();
  });

  it("keeps an old link without a tab on Asistencia, even when it carries a payments filter", async () => {
    renderWithSnackbar(await HistoryContent({ searchParams: searchParams({ origin: "auto_debit" }) }));

    expect(screen.getByTestId("attendance-section")).toBeDefined();
    expect(screen.queryByTestId("payments-section")).toBeNull();
  });

  it("ignores an unknown tab, an unknown origin and a page that is not a number", async () => {
    renderWithSnackbar(await HistoryContent({ searchParams: searchParams({ tab: "foo", page: "-3" }) }));
    expect(propsOf("attendance-section")).toEqual({ page: 1, next: "/history?page=2" });
  });

  it("falls back to no origin and page 1 on the payments tab when both are invalid", async () => {
    renderWithSnackbar(
      await HistoryContent({ searchParams: searchParams({ tab: "pagos", origin: "foo", page: "abc" }) }),
    );

    expect(propsOf("payments-section")).toEqual({ origin: null, page: 1 });
  });
});
