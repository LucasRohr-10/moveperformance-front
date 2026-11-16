import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithSnackbar } from "@/test/render-with-snackbar";

import { USER_ROLES } from "@/config/constants/user-roles.constants";

vi.mock("@/lib/session", () => ({ requireRole: vi.fn() }));
vi.mock("@/features/auto-debits", () => ({
  AutoDebitResult: ({ externalReference }: { externalReference: string | null }) => (
    <p>{`debit result ref=${String(externalReference)}`}</p>
  ),
}));
vi.mock("@/features/checkout", () => ({
  PurchaseResult: ({ externalReference, providerSaysRejected }: { externalReference: string | null; providerSaysRejected: boolean }) => (
    <p>{`result ref=${String(externalReference)} rejected=${String(providerSaysRejected)}`}</p>
  ),
}));

import { requireRole } from "@/lib/session";

import { ResultadoContent } from "./page";

const requireRoleMock = vi.mocked(requireRole);

async function renderContent(params: { ref?: string | string[]; status?: string | string[]; debito?: string | string[] }) {
  renderWithSnackbar(await ResultadoContent({ searchParams: Promise.resolve(params) }));
}

describe("ResultadoContent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("is reserved for clients and passes the reference through", async () => {
    await renderContent({ ref: "ref-1" });

    expect(requireRoleMock).toHaveBeenCalledWith(USER_ROLES.CLIENT);
    expect(screen.getByText("result ref=ref-1 rejected=false")).toBeDefined();
  });

  it("tells the result that Mercado Pago rejected the payment only for status=rejected", async () => {
    await renderContent({ ref: "ref-1", status: "rejected" });
    expect(screen.getByText("result ref=ref-1 rejected=true")).toBeDefined();
  });

  it("never turns status=approved into anything but the API's answer", async () => {
    await renderContent({ ref: "ref-1", status: "approved" });
    expect(screen.getByText("result ref=ref-1 rejected=false")).toBeDefined();
  });

  it("reads a repeated ref or status as its first value", async () => {
    await renderContent({ ref: ["ref-1", "ref-2"], status: ["rejected", "approved"] });
    expect(screen.getByText("result ref=ref-1 rejected=true")).toBeDefined();
  });

  it("passes a missing reference as null", async () => {
    await renderContent({});
    expect(screen.getByText("result ref=null rejected=false")).toBeDefined();
  });

  it("renders the debit result for ?debito= and the purchase result for ?ref=", async () => {
    await renderContent({ debito: "debit-1" });
    expect(screen.getByText("debit result ref=debit-1")).toBeDefined();
    expect(screen.queryByText(/^result ref=/)).toBeNull();
  });

  it("reads a repeated debito as its first value", async () => {
    await renderContent({ debito: ["debit-1", "debit-2"] });
    expect(screen.getByText("debit result ref=debit-1")).toBeDefined();
  });
});
