import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api/errors";
import type { ClientDetail, DeactivationPreview } from "@/lib/api/types";

import { DeactivateClientDialog } from "./deactivate-client-dialog";
import { deactivateClient, getDeactivationPreview } from "./clients-api";

const showSnackbar = vi.hoisted(() => vi.fn());

vi.mock("@/components/ui/snackbar", () => ({ useSnackbar: () => ({ showSnackbar }) }));
vi.mock("./clients-api", () => ({ getDeactivationPreview: vi.fn(), deactivateClient: vi.fn() }));

const previewMock = vi.mocked(getDeactivationPreview);
const deactivateMock = vi.mocked(deactivateClient);

const CLIENT: ClientDetail = {
  id: "c1",
  name: "Ana",
  lastName: "Gómez",
  email: "ana@move.test",
  phone: null,
  birthDate: null,
  age: null,
  clientSince: "2026-01-10T12:00:00.000Z",
  plan: null,
  paymentStatus: null,
  bookings: [],
  deactivation: null,
};
const DEACTIVATED: ClientDetail = {
  ...CLIENT,
  deactivation: { deactivatedAt: "2026-11-02T13:00:00.000Z", deactivatedByName: "Lucía Gómez", reason: "Se mudó" },
};
const PREVIEW: DeactivationPreview = { upcomingBookings: 2, hasCurrentPlan: true, autoDebits: 1, recoverySessionsLeft: 0 };
const MP_COPY =
  "No pudimos cancelar el débito automático en Mercado Pago y el cliente sigue activo. Probá de nuevo en unos minutos.";

function apiError(statusCode: number, code: string, message = "message del back") {
  return new ApiError({ statusCode, code, message });
}

function renderDialog() {
  const handlers = { onDeactivated: vi.fn(), onStale: vi.fn(), onClose: vi.fn() };
  render(<DeactivateClientDialog client={CLIENT} {...handlers} />);
  return handlers;
}

const confirmButton = () => screen.getByRole<HTMLButtonElement>("button", { name: "Dar de baja" });

beforeEach(() => {
  vi.clearAllMocks();
  previewMock.mockResolvedValue(PREVIEW);
});

describe("DeactivateClientDialog", () => {
  it("keeps Dar de baja disabled until the preview loads and when it fails", async () => {
    let resolvePreview: (preview: DeactivationPreview) => void = () => {};
    previewMock.mockReturnValueOnce(new Promise((resolve) => (resolvePreview = resolve)));
    renderDialog();

    expect(screen.getByRole("dialog", { name: "¿Dar de baja a Ana Gómez?" })).toBeDefined();
    expect(screen.getByText("Calculando qué se cancela…")).toBeDefined();
    expect(confirmButton().disabled).toBe(true);

    resolvePreview(PREVIEW);
    expect(await screen.findByText("Se cancelan 2 reservas futuras.")).toBeDefined();
    expect(confirmButton().disabled).toBe(false);
    expect(screen.queryByText("Calculando qué se cancela…")).toBeNull();
    expect(previewMock).toHaveBeenCalledWith("c1");
  });

  it("stays disabled when the preview fails and Reintentar asks again", async () => {
    previewMock.mockRejectedValueOnce(new Error("boom"));
    renderDialog();
    const user = userEvent.setup();

    expect(await screen.findByText("No pudimos calcular qué se cancela.")).toBeDefined();
    expect(confirmButton().disabled).toBe(true);
    // Going back stays possible so nobody is trapped in the dialog.
    expect(screen.getByRole<HTMLButtonElement>("button", { name: "Volver" }).disabled).toBe(false);

    await user.click(screen.getByRole("button", { name: "Reintentar" }));

    expect(await screen.findByText("Se cancelan 2 reservas futuras.")).toBeDefined();
    expect(previewMock).toHaveBeenCalledTimes(2);
    expect(confirmButton().disabled).toBe(false);
  });

  it("shows the real numbers", async () => {
    renderDialog();

    expect(await screen.findByText("Se cancelan 2 reservas futuras.")).toBeDefined();
    expect(screen.getByText("El plan queda inactivo mientras esté de baja.")).toBeDefined();
    expect(screen.getByText("Se cancela el débito automático.")).toBeDefined();
    expect(screen.getByText("No va a poder entrar a la app ni se le va a poder reservar.")).toBeDefined();
    expect(screen.getByText("No le llega ningún mail ni aviso por las reservas canceladas.")).toBeDefined();
    expect(screen.getByText("Solo lo ve Staff.")).toBeDefined();
  });

  it("deactivates with the trimmed reason", async () => {
    deactivateMock.mockResolvedValue(DEACTIVATED);
    const { onDeactivated } = renderDialog();
    const user = userEvent.setup();
    await screen.findByText("Se cancelan 2 reservas futuras.");

    await user.type(screen.getByLabelText("Motivo (opcional)"), "  Se mudó  ");
    await user.click(confirmButton());

    expect(deactivateMock).toHaveBeenCalledWith("c1", "Se mudó");
    await waitFor(() => expect(onDeactivated).toHaveBeenCalledWith(DEACTIVATED));
    expect(showSnackbar).toHaveBeenCalledWith({ tone: "success", title: "Cliente dado de baja." });
  });

  it("sends null without a reason", async () => {
    deactivateMock.mockResolvedValue(DEACTIVATED);
    renderDialog();
    const user = userEvent.setup();
    await screen.findByText("Se cancelan 2 reservas futuras.");

    await user.type(screen.getByLabelText("Motivo (opcional)"), "   ");
    await user.click(confirmButton());

    expect(deactivateMock).toHaveBeenCalledWith("c1", null);
  });

  it("deactivates once on a double click", async () => {
    deactivateMock.mockReturnValue(new Promise(() => {}));
    renderDialog();
    const user = userEvent.setup();
    await screen.findByText("Se cancelan 2 reservas futuras.");

    await user.dblClick(confirmButton());

    expect(deactivateMock).toHaveBeenCalledTimes(1);
  });

  it("limits the reason to 240 characters", async () => {
    renderDialog();
    await screen.findByText("Se cancelan 2 reservas futuras.");

    expect(screen.getByLabelText<HTMLTextAreaElement>("Motivo (opcional)").maxLength).toBe(240);
  });

  it("keeps the client active when Mercado Pago fails", async () => {
    deactivateMock.mockRejectedValue(apiError(502, "PAYMENT_PROVIDER_ERROR"));
    const { onDeactivated, onClose } = renderDialog();
    const user = userEvent.setup();
    await screen.findByText("Se cancelan 2 reservas futuras.");

    await user.type(screen.getByLabelText("Motivo (opcional)"), "Se mudó");
    await user.click(confirmButton());

    await waitFor(() =>
      expect(showSnackbar).toHaveBeenCalledWith({ tone: "danger", title: MP_COPY, persistent: true }),
    );
    expect(onDeactivated).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByLabelText<HTMLTextAreaElement>("Motivo (opcional)").value).toBe("Se mudó");
    expect(confirmButton().disabled).toBe(false);
  });

  it("reloads the client when someone else already deactivated it (on confirm)", async () => {
    deactivateMock.mockRejectedValue(apiError(409, "CLIENT_ALREADY_DEACTIVATED", "Ya está dado de baja."));
    const { onStale, onClose, onDeactivated } = renderDialog();
    const user = userEvent.setup();
    await screen.findByText("Se cancelan 2 reservas futuras.");

    await user.click(confirmButton());

    await waitFor(() => expect(onStale).toHaveBeenCalledTimes(1));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onDeactivated).not.toHaveBeenCalled();
    expect(showSnackbar).toHaveBeenCalledWith({ tone: "info", title: "Ya está dado de baja." });
  });

  it("reloads the client when the preview finds it already deactivated", async () => {
    previewMock.mockReset();
    previewMock.mockRejectedValue(apiError(409, "CLIENT_ALREADY_DEACTIVATED", "Ya está dado de baja."));
    const { onStale, onClose } = renderDialog();

    await waitFor(() => expect(onStale).toHaveBeenCalledTimes(1));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(showSnackbar).toHaveBeenCalledWith({ tone: "info", title: "Ya está dado de baja." });
  });

  it("shows a fallback snackbar for any other failure and keeps the dialog open", async () => {
    deactivateMock.mockRejectedValue(new Error("boom"));
    const { onClose, onStale } = renderDialog();
    const user = userEvent.setup();
    await screen.findByText("Se cancelan 2 reservas futuras.");

    await user.click(confirmButton());

    await waitFor(() =>
      expect(showSnackbar).toHaveBeenCalledWith({
        tone: "danger",
        title: "No pudimos dar de baja al cliente. Probá de nuevo.",
      }),
    );
    expect(onClose).not.toHaveBeenCalled();
    expect(onStale).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toBeDefined();
  });
});
