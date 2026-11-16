import { fireEvent, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api/errors";
import type { ClientDetail } from "@/lib/api/types";
import { renderWithSnackbar } from "@/test/render-with-snackbar";

import { updateClientProfile } from "./clients-api";
import { EditClientDialog } from "./edit-client-dialog";

vi.mock("./clients-api", () => ({ updateClientProfile: vi.fn() }));

const updateMock = vi.mocked(updateClientProfile);

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

function renderDialog() {
  const onSaved = vi.fn();
  const onClose = vi.fn();
  renderWithSnackbar(<EditClientDialog client={CLIENT} onSaved={onSaved} onClose={onClose} />);
  return { onSaved, onClose };
}

beforeEach(() => vi.clearAllMocks());

describe("EditClientDialog", () => {
  it("opens prefilled and shows the email as read-only text", () => {
    renderDialog();

    expect(screen.getByRole("dialog", { name: "Editar datos de Ana Gómez" })).toBeDefined();
    expect(screen.getByLabelText<HTMLInputElement>("Nombre").value).toBe("Ana");
    expect(screen.getByLabelText<HTMLInputElement>("Apellido").value).toBe("Gómez");
    expect(screen.getByLabelText<HTMLInputElement>("Teléfono").value).toBe("099 123 456");
    expect(screen.getByLabelText<HTMLInputElement>("Fecha de nacimiento").value).toBe("1990-03-12");
    expect(screen.queryByRole("textbox", { name: "Email" })).toBeNull();
    expect(screen.getByText("ana@move.test")).toBeDefined();
    expect(screen.getByText("No se puede cambiar.")).toBeDefined();
  });

  it("saves only what changed", async () => {
    const updated = { ...CLIENT, name: "Anita" };
    updateMock.mockResolvedValue(updated);
    const { onSaved } = renderDialog();
    const user = userEvent.setup();

    const name = screen.getByLabelText("Nombre");
    await user.clear(name);
    await user.type(name, "Anita");
    await user.click(screen.getByRole("button", { name: "Guardar" }));

    expect(updateMock).toHaveBeenCalledWith("c1", { name: "Anita" });
    expect(await screen.findByText("Datos guardados.")).toBeDefined();
    expect(onSaved).toHaveBeenCalledWith(updated);
  });

  it("closes with an info snackbar when nothing changed", async () => {
    const { onClose, onSaved } = renderDialog();

    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));

    expect(updateMock).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onSaved).not.toHaveBeenCalled();
    expect(await screen.findByText("No hay cambios para guardar.")).toBeDefined();
  });

  it("shows field errors and keeps the dialog open", async () => {
    const { onClose } = renderDialog();
    const user = userEvent.setup();

    await user.clear(screen.getByLabelText("Nombre"));
    fireEvent.change(screen.getByLabelText("Fecha de nacimiento"), { target: { value: "" } });
    await user.click(screen.getByRole("button", { name: "Guardar" }));

    expect(await screen.findByText("Ingresá el nombre.")).toBeDefined();
    expect(screen.getByText("Ingresá la fecha de nacimiento.")).toBeDefined();
    expect(updateMock).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("shows the field errors the API sends back and keeps the dialog open", async () => {
    updateMock.mockRejectedValue(
      new ApiError({
        statusCode: 400,
        code: "VALIDATION_FAILED",
        message: "Datos inválidos.",
        details: [{ field: "phone", messages: ["Teléfono inválido para Uruguay."] }],
      }),
    );
    const { onClose } = renderDialog();
    const user = userEvent.setup();

    await user.clear(screen.getByLabelText("Apellido"));
    await user.type(screen.getByLabelText("Apellido"), "Pérez");
    await user.click(screen.getByRole("button", { name: "Guardar" }));

    expect(await screen.findByText("Teléfono inválido para Uruguay.")).toBeDefined();
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole<HTMLButtonElement>("button", { name: "Guardar" }).disabled).toBe(false);
  });

  it("shows a fallback snackbar when saving fails", async () => {
    updateMock.mockRejectedValue(new Error("boom"));
    const { onSaved } = renderDialog();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("Nombre"), "a");
    await user.click(screen.getByRole("button", { name: "Guardar" }));

    expect(await screen.findByText("No pudimos guardar los datos. Probá de nuevo.")).toBeDefined();
    expect(onSaved).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toBeDefined();
  });

  it("closes without saving on Cancelar", async () => {
    const { onClose } = renderDialog();

    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(updateMock).not.toHaveBeenCalled();
  });
});
