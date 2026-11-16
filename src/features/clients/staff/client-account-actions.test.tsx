import { cleanup, fireEvent, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { ClientDetail } from "@/lib/api/types";
import { renderWithSnackbar } from "@/test/render-with-snackbar";

import { ClientAccountActions } from "./client-account-actions";

vi.mock("./clients-api", () => ({
  updateClientProfile: vi.fn(),
  setClientPassword: vi.fn(),
  getDeactivationPreview: vi.fn().mockResolvedValue({ upcomingBookings: 0, hasCurrentPlan: false, autoDebits: 0, recoverySessionsLeft: 0 }),
  deactivateClient: vi.fn(),
  reactivateClient: vi.fn(),
}));

const CLIENT: ClientDetail = {
  id: "c1",
  name: "Ana",
  lastName: "Gómez",
  email: "ana@move.test",
  phone: "+59899123456",
  birthDate: "1990-03-12",
  age: 36,
  clientSince: "2026-01-10T12:00:00.000Z",
  plan: null,
  paymentStatus: null,
  bookings: [],
  deactivation: null,
};

const DEACTIVATED: ClientDetail = {
  ...CLIENT,
  deactivation: { deactivatedAt: "2026-11-02T13:00:00.000Z", deactivatedByName: null, reason: null },
};

function renderActions(client: ClientDetail = CLIENT) {
  renderWithSnackbar(<ClientAccountActions client={client} onClientChange={vi.fn()} onReload={vi.fn()} />);
}

describe("ClientAccountActions", () => {
  it("opens one dialog at a time and closes it with Cancelar", async () => {
    renderActions();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Editar datos" }));
    expect(screen.getAllByRole("dialog")).toHaveLength(1);
    expect(screen.getByRole("dialog", { name: "Editar datos de Ana Gómez" })).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: "Cambiar clave" }));
    expect(screen.getAllByRole("dialog")).toHaveLength(1);
    expect(screen.getByRole("dialog", { name: "Cambiar la clave de Ana Gómez" })).toBeDefined();

    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("starts every opening from a clean form", async () => {
    renderActions();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Editar datos" }));
    await user.type(screen.getByLabelText("Nombre"), "zzz");
    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    await user.click(screen.getByRole("button", { name: "Editar datos" }));

    expect(screen.getByLabelText<HTMLInputElement>("Nombre").value).toBe("Ana");
  });

  it("offers Dar de baja for an active client and Reactivar for a deactivated one", () => {
    renderActions();
    expect(screen.getByRole("button", { name: "Dar de baja" })).toBeDefined();
    expect(screen.queryByRole("button", { name: "Reactivar" })).toBeNull();
    cleanup();

    renderActions(DEACTIVATED);
    expect(screen.getByRole("button", { name: "Reactivar" })).toBeDefined();
    expect(screen.queryByRole("button", { name: "Dar de baja" })).toBeNull();
  });

  it("opens the deactivation and reactivation dialogs", async () => {
    renderActions();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Dar de baja" }));
    expect(screen.getByRole("dialog", { name: "¿Dar de baja a Ana Gómez?" })).toBeDefined();
    await user.click(screen.getByRole("button", { name: "Volver" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    cleanup();

    renderActions(DEACTIVATED);
    await user.click(screen.getByRole("button", { name: "Reactivar" }));
    expect(screen.getByRole("dialog", { name: "¿Reactivar a Ana Gómez?" })).toBeDefined();
  });
});
