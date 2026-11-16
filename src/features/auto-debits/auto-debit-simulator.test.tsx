import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithSnackbar } from "@/test/render-with-snackbar";

import { ApiError } from "@/lib/api/errors";
import type { AutoDebitDto } from "@/lib/api/types";

const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));
vi.mock("./auto-debits-api", () => ({ simulateAutoDebit: vi.fn() }));

import { AutoDebitSimulator } from "./auto-debit-simulator";
import { simulateAutoDebit } from "./auto-debits-api";

const simulateAutoDebitMock = vi.mocked(simulateAutoDebit);
const REF = "ref/1";

const debit: AutoDebitDto = {
  id: "debit-1",
  externalReference: REF,
  planId: "plan-1",
  planName: "Mensual",
  service: "performance",
  status: "authorized",
  amount: 3900,
  currency: "UYU",
  frequency: 1,
  frequencyType: "months",
  nextChargeOn: "2026-12-12",
  createdAt: "2026-10-12T10:00:00.000Z",
  cancelledAt: null,
  cancelReason: null,
};

const apiError = (code: string, message: string) => new ApiError({ statusCode: 404, code, message });

describe("AutoDebitSimulator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("offers the four actions", () => {
    renderWithSnackbar(<AutoDebitSimulator externalReference={REF} />);

    for (const name of ["Autorizar", "Cobrar ciclo (aprobado)", "Cobrar ciclo (rechazado)", "Cancelar"]) {
      expect(screen.getByRole("button", { name })).toBeDefined();
    }
  });

  it("asks for the reference when it is missing", () => {
    renderWithSnackbar(<AutoDebitSimulator externalReference={null} />);

    expect(screen.getByText("Falta la referencia del débito.")).toBeDefined();
    expect(screen.queryByRole("button", { name: "Autorizar" })).toBeNull();
  });

  it("authorizes and goes back to the result", async () => {
    simulateAutoDebitMock.mockResolvedValue(debit);
    renderWithSnackbar(<AutoDebitSimulator externalReference={REF} />);

    await userEvent.click(screen.getByRole("button", { name: "Autorizar" }));

    expect(simulateAutoDebitMock).toHaveBeenCalledWith(REF, "authorize");
    await vi.waitFor(() => expect(replace).toHaveBeenCalledWith("/checkout/resultado?debito=ref%2F1"));
  });

  it("cancels and goes back to the result", async () => {
    simulateAutoDebitMock.mockResolvedValue({ ...debit, status: "cancelled" });
    renderWithSnackbar(<AutoDebitSimulator externalReference={REF} />);

    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(simulateAutoDebitMock).toHaveBeenCalledWith(REF, "cancel");
    await vi.waitFor(() => expect(replace).toHaveBeenCalledWith("/checkout/resultado?debito=ref%2F1"));
  });

  it("charges a cycle and shows the new status without leaving the page", async () => {
    simulateAutoDebitMock.mockResolvedValue(debit);
    renderWithSnackbar(<AutoDebitSimulator externalReference={REF} />);

    await userEvent.click(screen.getByRole("button", { name: "Cobrar ciclo (aprobado)" }));

    expect(simulateAutoDebitMock).toHaveBeenCalledWith(REF, "charge_approved");
    expect((await screen.findByRole("status")).textContent).toBe("Débito automático activo · próximo cobro 12/12");
    expect(replace).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Cobrar ciclo (rechazado)" })).toHaveProperty("disabled", false);
  });

  it("charges a rejected cycle", async () => {
    simulateAutoDebitMock.mockResolvedValue(debit);
    renderWithSnackbar(<AutoDebitSimulator externalReference={REF} />);

    await userEvent.click(screen.getByRole("button", { name: "Cobrar ciclo (rechazado)" }));

    expect(simulateAutoDebitMock).toHaveBeenCalledWith(REF, "charge_rejected");
  });

  it("disables all the buttons while an action is in flight", async () => {
    simulateAutoDebitMock.mockReturnValue(new Promise(() => undefined));
    renderWithSnackbar(<AutoDebitSimulator externalReference={REF} />);

    await userEvent.click(screen.getByRole("button", { name: "Autorizar" }));

    for (const button of screen.getAllByRole("button")) expect(button).toHaveProperty("disabled", true);
    expect(simulateAutoDebitMock).toHaveBeenCalledTimes(1);
  });

  it("says the simulator is off when the API has none", async () => {
    simulateAutoDebitMock.mockRejectedValue(apiError("NOT_FOUND", "Not found"));
    renderWithSnackbar(<AutoDebitSimulator externalReference={REF} />);

    await userEvent.click(screen.getByRole("button", { name: "Autorizar" }));

    expect(await screen.findByText("Simulador desactivado")).toBeDefined();
  });

  it("says the debit is not there on AUTO_DEBIT_NOT_FOUND", async () => {
    simulateAutoDebitMock.mockRejectedValue(apiError("AUTO_DEBIT_NOT_FOUND", "El débito automático no existe."));
    renderWithSnackbar(<AutoDebitSimulator externalReference={REF} />);

    await userEvent.click(screen.getByRole("button", { name: "Autorizar" }));

    expect(await screen.findByText("No encontramos el débito")).toBeDefined();
  });

  it("shows another API error and lets the client try again", async () => {
    simulateAutoDebitMock.mockRejectedValue(
      new ApiError({ statusCode: 502, code: "PAYMENT_PROVIDER_ERROR", message: "Mercado Pago no responde." }),
    );
    renderWithSnackbar(<AutoDebitSimulator externalReference={REF} />);

    await userEvent.click(screen.getByRole("button", { name: "Autorizar" }));

    expect((await screen.findByRole("alert")).textContent).toContain("Mercado Pago no responde.");
    expect(screen.getByRole("button", { name: "Autorizar" })).toHaveProperty("disabled", false);
  });

  it("shows a fixed message when the request itself fails", async () => {
    simulateAutoDebitMock.mockRejectedValue(new TypeError("Failed to fetch"));
    renderWithSnackbar(<AutoDebitSimulator externalReference={REF} />);

    await userEvent.click(screen.getByRole("button", { name: "Autorizar" }));

    expect((await screen.findByRole("alert")).textContent).toContain("No pudimos simular el débito. Probá de nuevo.");
  });
});
