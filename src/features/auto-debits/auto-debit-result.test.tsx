import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AutoDebitResultState } from "./present-auto-debit-result";

vi.mock("./use-auto-debit-status", () => ({ useAutoDebitStatus: vi.fn() }));

import { AutoDebitResult } from "./auto-debit-result";
import { useAutoDebitStatus } from "./use-auto-debit-status";

const useAutoDebitStatusMock = vi.mocked(useAutoDebitStatus);
const recheck = vi.fn();

const debit = {
  id: "debit-1",
  externalReference: "ref-1",
  planId: "plan-mensual",
  planName: "Mensual",
  service: "performance",
  status: "pending",
  amount: 3900,
  currency: "UYU",
  frequency: 1,
  frequencyType: "months",
  nextChargeOn: null,
  createdAt: "2026-10-12T10:00:00.000Z",
  cancelledAt: null,
  cancelReason: null,
} as const;

function givenState(state: AutoDebitResultState) {
  useAutoDebitStatusMock.mockReturnValue({ state, recheck });
}

describe("AutoDebitResult", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("has the polite status region from the first render, while loading", () => {
    givenState({ kind: "loading" });
    render(<AutoDebitResult externalReference="ref-1" />);

    const region = screen.getByRole("status");
    expect(region.getAttribute("aria-live")).toBe("polite");
    expect(within(region).getByText("Consultando tu débito…")).toBeDefined();
  });

  it("queries the debit by its reference", () => {
    givenState({ kind: "loading" });
    render(<AutoDebitResult externalReference="ref-1" />);

    expect(useAutoDebitStatusMock).toHaveBeenCalledWith("ref-1");
  });

  it("waits for the Mercado Pago confirmation while the debit is pending", () => {
    givenState({ kind: "loaded", debit, timedOut: false });
    render(<AutoDebitResult externalReference="ref-1" />);

    expect(screen.getByRole("heading", { name: "Confirmando tu débito" })).toBeDefined();
    expect(screen.getByText("Estamos esperando la confirmación de Mercado Pago. No cierres esta página.")).toBeDefined();
    expect(screen.getByTestId("notice-spinner")).toBeDefined();
    expect(screen.queryByText("Débito automático activo")).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("shows the active debit with the amount, the next charge and a link to the profile", () => {
    givenState({ kind: "loaded", debit: { ...debit, status: "authorized", nextChargeOn: "2026-11-12" }, timedOut: false });
    render(<AutoDebitResult externalReference="ref-1" />);

    expect(screen.getByRole("heading", { name: "Débito automático activo" })).toBeDefined();
    expect(screen.getByText("Mensual")).toBeDefined();
    expect(screen.getByText("$ 3.900")).toBeDefined();
    expect(screen.getByText("12/11/2026")).toBeDefined();
    expect(screen.getByRole("link", { name: "Ir a mi perfil" }).getAttribute("href")).toBe("/dashboard");
  });

  it("says the debit is in process after the wait ran out, and offers to try again", async () => {
    givenState({ kind: "loaded", debit, timedOut: true });
    render(<AutoDebitResult externalReference="ref-1" />);

    expect(screen.getByRole("heading", { name: "Débito en proceso" })).toBeDefined();
    await userEvent.click(screen.getByRole("button", { name: "Intentar de nuevo" }));

    expect(recheck).toHaveBeenCalledTimes(1);
  });

  it("links a cancelled debit back to the checkout of its plan", () => {
    givenState({ kind: "loaded", debit: { ...debit, status: "cancelled" }, timedOut: false });
    render(<AutoDebitResult externalReference="ref-1" />);

    expect(screen.getByRole("heading", { name: "Débito no activado" })).toBeDefined();
    expect(screen.getByRole("link", { name: "Volver a intentar" }).getAttribute("href")).toBe(
      "/checkout/plan/plan-mensual",
    );
  });

  it("shows that the debit does not exist on AUTO_DEBIT_NOT_FOUND, without a retry button", () => {
    givenState({ kind: "not-found" });
    render(<AutoDebitResult externalReference="ref-1" />);

    expect(screen.getByRole("heading", { name: "No encontramos el débito" })).toBeDefined();
    expect(screen.getByRole("link", { name: "Ir a mi perfil" })).toBeDefined();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("shows an error with retry when the first request fails", async () => {
    givenState({ kind: "error" });
    render(<AutoDebitResult externalReference="ref-1" />);

    expect(screen.getByRole("alert").textContent).toContain("No pudimos consultar tu débito.");
    await userEvent.click(screen.getByRole("button", { name: "Reintentar" }));

    expect(recheck).toHaveBeenCalledTimes(1);
  });

  it("says it did not find the debit when the link has no reference", () => {
    givenState({ kind: "loading" });
    render(<AutoDebitResult externalReference={null} />);

    expect(screen.getByRole("heading", { name: "No encontramos el débito" })).toBeDefined();
  });
});
