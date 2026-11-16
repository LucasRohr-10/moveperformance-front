import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithSnackbar } from "@/test/render-with-snackbar";

import { USER_ROLES } from "@/config/constants/user-roles.constants";

vi.mock("@/lib/session", () => ({ requireRole: vi.fn() }));
vi.mock("@/features/auto-debits", () => ({
  AutoDebitSimulator: ({ externalReference }: { externalReference: string | null }) => (
    <p>{`debit simulator ref=${String(externalReference)}`}</p>
  ),
}));
vi.mock("@/features/checkout", () => ({
  SimulatorPanel: ({ externalReference }: { externalReference: string | null }) => (
    <p>{`simulator ref=${String(externalReference)}`}</p>
  ),
}));

import { requireRole } from "@/lib/session";

import { SimuladoContent } from "./page";

const requireRoleMock = vi.mocked(requireRole);

describe("SimuladoContent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("is reserved for clients and passes the reference through", async () => {
    renderWithSnackbar(await SimuladoContent({ searchParams: Promise.resolve({ ref: "ref-1" }) }));

    expect(requireRoleMock).toHaveBeenCalledWith(USER_ROLES.CLIENT);
    expect(screen.getByText("simulator ref=ref-1")).toBeDefined();
  });

  it("reads a repeated ref as its first value", async () => {
    renderWithSnackbar(await SimuladoContent({ searchParams: Promise.resolve({ ref: ["ref-1", "ref-2"] }) }));
    expect(screen.getByText("simulator ref=ref-1")).toBeDefined();
  });

  it("passes a missing reference as null", async () => {
    renderWithSnackbar(await SimuladoContent({ searchParams: Promise.resolve({}) }));
    expect(screen.getByText("simulator ref=null")).toBeDefined();
  });

  it("renders the debit simulator for ?debito= and the payment simulator for ?ref=", async () => {
    renderWithSnackbar(await SimuladoContent({ searchParams: Promise.resolve({ debito: "debit-1" }) }));

    expect(screen.getByText("debit simulator ref=debit-1")).toBeDefined();
    expect(screen.queryByText(/^simulator ref=/)).toBeNull();
  });
});
