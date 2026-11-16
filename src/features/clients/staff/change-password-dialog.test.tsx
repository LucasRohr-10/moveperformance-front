import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ClientDetail } from "@/lib/api/types";
import { renderWithSnackbar } from "@/test/render-with-snackbar";

import { ChangePasswordDialog } from "./change-password-dialog";
import { setClientPassword } from "./clients-api";

vi.mock("./clients-api", () => ({ setClientPassword: vi.fn() }));

const setPasswordMock = vi.mocked(setClientPassword);

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

function renderDialog() {
  const onClose = vi.fn();
  renderWithSnackbar(<ChangePasswordDialog client={CLIENT} onClose={onClose} />);
  return { onClose };
}

beforeEach(() => vi.clearAllMocks());

describe("ChangePasswordDialog", () => {
  it("explains that sessions close and nothing is mailed", () => {
    renderDialog();

    expect(screen.getByRole("dialog", { name: "Cambiar la clave de Ana Gómez" })).toBeDefined();
    expect(
      screen.getByText(
        "Se cierran todas sus sesiones abiertas. Pasale la clave nueva vos: no le mandamos ningún mail.",
      ),
    ).toBeDefined();
    expect(screen.getByLabelText<HTMLInputElement>("Clave").value).toBe("");
  });

  it("refuses a short password without calling the API", async () => {
    const { onClose } = renderDialog();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("Clave"), "Abc123!");
    await user.click(screen.getByRole("button", { name: "Cambiar clave" }));

    expect(await screen.findByText("La clave necesita al menos 8 caracteres.")).toBeDefined();
    expect(setPasswordMock).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("sets the password, confirms and closes", async () => {
    setPasswordMock.mockResolvedValue(undefined);
    const { onClose } = renderDialog();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("Clave"), "Hd4@vNz8kTq3");
    await user.click(screen.getByRole("button", { name: "Cambiar clave" }));

    expect(setPasswordMock).toHaveBeenCalledWith("c1", "Hd4@vNz8kTq3");
    expect(await screen.findByText("Clave cambiada.")).toBeDefined();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("sends one request on a double click", async () => {
    setPasswordMock.mockReturnValue(new Promise(() => {}));
    renderDialog();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("Clave"), "Hd4@vNz8kTq3");
    await user.dblClick(screen.getByRole("button", { name: "Cambiar clave" }));

    expect(setPasswordMock).toHaveBeenCalledTimes(1);
  });

  it("keeps the dialog open with the typed password when it fails", async () => {
    setPasswordMock.mockRejectedValue(new Error("boom"));
    const { onClose } = renderDialog();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("Clave"), "Hd4@vNz8kTq3");
    await user.click(screen.getByRole("button", { name: "Cambiar clave" }));

    expect(await screen.findByText("No pudimos cambiar la clave. Probá de nuevo.")).toBeDefined();
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByLabelText<HTMLInputElement>("Clave").value).toBe("Hd4@vNz8kTq3");
    expect(screen.getByRole<HTMLButtonElement>("button", { name: "Cambiar clave" }).disabled).toBe(false);
  });
});
