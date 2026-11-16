import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithSnackbar } from "@/test/render-with-snackbar";

import { ApiError } from "@/lib/api/errors";

const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));
vi.mock("./checkout-api", () => ({ simulatePayment: vi.fn() }));

import { simulatePayment } from "./checkout-api";
import { SimulatorPanel } from "./simulator-panel";

const simulatePaymentMock = vi.mocked(simulatePayment);
const REF = "ref/1";

const apiError = (code: string, message: string) => new ApiError({ statusCode: 404, code, message });

describe("SimulatorPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("asks for the reference when it is missing", () => {
    renderWithSnackbar(<SimulatorPanel externalReference={null} />);

    expect(screen.getByText("No encontramos la operación")).toBeDefined();
    expect(screen.getByText("Falta la referencia del pago.")).toBeDefined();
    expect(screen.queryByRole("button", { name: "Aprobar" })).toBeNull();
  });

  it("explains what the panel is for", () => {
    renderWithSnackbar(<SimulatorPanel externalReference={REF} />);

    expect(screen.getByRole("heading", { name: "Simulador de pagos (desarrollo)" })).toBeDefined();
    expect(screen.getByText("Elegí el resultado del pago para continuar sin Mercado Pago.")).toBeDefined();
  });

  it("approves and continues to the result page", async () => {
    simulatePaymentMock.mockResolvedValue({ externalReference: REF, status: "approved" });
    renderWithSnackbar(<SimulatorPanel externalReference={REF} />);

    await userEvent.click(screen.getByRole("button", { name: "Aprobar" }));

    expect(simulatePaymentMock).toHaveBeenCalledWith(REF, "approved");
    await vi.waitFor(() => expect(replace).toHaveBeenCalledWith("/checkout/resultado?ref=ref%2F1"));
  });

  it("rejects and continues to the result page carrying status=rejected", async () => {
    simulatePaymentMock.mockResolvedValue({ externalReference: REF, status: "pending" });
    renderWithSnackbar(<SimulatorPanel externalReference={REF} />);

    await userEvent.click(screen.getByRole("button", { name: "Rechazar" }));

    expect(simulatePaymentMock).toHaveBeenCalledWith(REF, "rejected");
    await vi.waitFor(() =>
      expect(replace).toHaveBeenCalledWith("/checkout/resultado?ref=ref%2F1&status=rejected"),
    );
  });

  it("disables both buttons while the simulation is in flight", async () => {
    simulatePaymentMock.mockReturnValue(new Promise(() => undefined));
    renderWithSnackbar(<SimulatorPanel externalReference={REF} />);

    await userEvent.click(screen.getByRole("button", { name: "Aprobar" }));

    expect(screen.getByRole("button", { name: "Aprobar" }).hasAttribute("disabled")).toBe(true);
    expect(screen.getByRole("button", { name: "Rechazar" }).hasAttribute("disabled")).toBe(true);
    expect(simulatePaymentMock).toHaveBeenCalledTimes(1);
  });

  it("keeps both buttons at least 44 px high on mobile", () => {
    renderWithSnackbar(<SimulatorPanel externalReference={REF} />);

    expect(screen.getByRole("button", { name: "Aprobar" }).className).toContain("min-h-11");
    expect(screen.getByRole("button", { name: "Rechazar" }).className).toContain("min-h-11");
  });

  it("shows that the simulator is off when the API does not expose it", async () => {
    simulatePaymentMock.mockRejectedValue(apiError("NOT_FOUND", "No encontrado."));
    renderWithSnackbar(<SimulatorPanel externalReference={REF} />);

    await userEvent.click(screen.getByRole("button", { name: "Aprobar" }));

    expect(await screen.findByText("Simulador desactivado")).toBeDefined();
    expect(screen.getByText("Los pagos van por Mercado Pago.")).toBeDefined();
    expect(screen.queryByRole("button", { name: "Aprobar" })).toBeNull();
    expect(replace).not.toHaveBeenCalled();
  });

  it("shows that the operation does not exist on PURCHASE_NOT_FOUND", async () => {
    simulatePaymentMock.mockRejectedValue(apiError("PURCHASE_NOT_FOUND", "No encontramos la compra."));
    renderWithSnackbar(<SimulatorPanel externalReference={REF} />);

    await userEvent.click(screen.getByRole("button", { name: "Rechazar" }));

    expect(await screen.findByText("No encontramos la operación")).toBeDefined();
    expect(screen.queryByRole("button", { name: "Rechazar" })).toBeNull();
    expect(replace).not.toHaveBeenCalled();
  });

  it("shows that the operation does not exist when the reference is malformed", async () => {
    simulatePaymentMock.mockRejectedValue(
      new ApiError({ statusCode: 400, code: "VALIDATION_FAILED", message: "externalReference must be a UUID" }),
    );
    renderWithSnackbar(<SimulatorPanel externalReference={REF} />);

    await userEvent.click(screen.getByRole("button", { name: "Aprobar" }));

    expect(await screen.findByText("No encontramos la operación")).toBeDefined();
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.queryByText("externalReference must be a UUID")).toBeNull();
    expect(screen.queryByRole("button", { name: "Aprobar" })).toBeNull();
    expect(replace).not.toHaveBeenCalled();
  });

  it("shows other API errors inline and stays on the page", async () => {
    simulatePaymentMock.mockRejectedValue(
      new ApiError({ statusCode: 409, code: "SOMETHING_ELSE", message: "No se pudo aplicar el pago." }),
    );
    renderWithSnackbar(<SimulatorPanel externalReference={REF} />);

    await userEvent.click(screen.getByRole("button", { name: "Rechazar" }));

    expect((await screen.findByRole("alert")).textContent).toContain("No se pudo aplicar el pago.");
    expect(screen.getByRole("button", { name: "Rechazar" }).hasAttribute("disabled")).toBe(false);
    expect(replace).not.toHaveBeenCalled();
  });

  it("shows a fallback message on a network error", async () => {
    simulatePaymentMock.mockRejectedValue(new TypeError("Failed to fetch"));
    renderWithSnackbar(<SimulatorPanel externalReference={REF} />);

    await userEvent.click(screen.getByRole("button", { name: "Aprobar" }));

    expect((await screen.findByRole("alert")).textContent).toContain("No pudimos simular el pago. Probá de nuevo.");
    expect(replace).not.toHaveBeenCalled();
  });
});
