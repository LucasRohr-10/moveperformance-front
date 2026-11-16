import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api/errors";
import type { BirthdaySettingsDto } from "@/lib/api/types";
import { renderWithSnackbar } from "@/test/render-with-snackbar";

import { BirthdaySettingsForm } from "./birthday-settings-form";
import { saveBirthdaySettings } from "./staff-birthdays-api";

vi.mock("./staff-birthdays-api");

const saveMock = vi.mocked(saveBirthdaySettings);

const SETTINGS: BirthdaySettingsDto = {
  message: "Hoy queremos celebrarte.",
  emailEnabled: true,
  whatsappEnabled: true,
  sendHour: 9,
};

function renderForm(settings: BirthdaySettingsDto = SETTINGS, todayMailsSent = 0) {
  const onSaved = vi.fn();
  renderWithSnackbar(<BirthdaySettingsForm settings={settings} todayMailsSent={todayMailsSent} onSaved={onSaved} />);
  return { onSaved };
}

beforeEach(() => {
  vi.resetAllMocks();
});

describe("BirthdaySettingsForm", () => {
  it("loads the saved settings", () => {
    renderForm();

    expect(screen.getByText("Saludo de cumpleaños")).toBeDefined();
    expect(screen.getByLabelText<HTMLTextAreaElement>("Mensaje").value).toBe("Hoy queremos celebrarte.");
    expect(screen.getByRole<HTMLInputElement>("checkbox", { name: /Mail/ }).checked).toBe(true);
    expect(screen.getByRole<HTMLInputElement>("checkbox", { name: /WhatsApp/ }).checked).toBe(true);
    const hour = screen.getByLabelText<HTMLSelectElement>("Hora");
    expect(hour.selectedOptions[0].textContent).toBe("09:00");
    expect(hour.options[0].textContent).toBe("06:00");
    expect(hour.options[hour.options.length - 1].textContent).toBe("22:00");
  });

  it("saves the whole settings", async () => {
    const saved = { message: "Feliz día", emailEnabled: false, whatsappEnabled: true, sendHour: 10 };
    saveMock.mockResolvedValue(saved);
    const { onSaved } = renderForm();
    const user = userEvent.setup();

    await user.clear(screen.getByLabelText("Mensaje"));
    await user.type(screen.getByLabelText("Mensaje"), "Feliz día");
    await user.click(screen.getByRole("checkbox", { name: /Mail/ }));
    await user.selectOptions(screen.getByLabelText("Hora"), "10");
    await user.click(screen.getByRole("button", { name: "Guardar" }));

    expect(saveMock).toHaveBeenCalledWith(saved);
    expect(await screen.findByText("Saludo de cumpleaños guardado.")).toBeDefined();
    expect(onSaved).toHaveBeenCalledWith(saved);
  });

  it("shows the counter", async () => {
    renderForm({ ...SETTINGS, message: "Hola" });

    expect(screen.getByText("4/500")).toBeDefined();
  });

  it("refuses an empty message", async () => {
    renderForm();
    const user = userEvent.setup();

    await user.clear(screen.getByLabelText("Mensaje"));
    await user.click(screen.getByRole("button", { name: "Guardar" }));

    expect(screen.getAllByText("Escribí el mensaje.").length).toBeGreaterThan(0);
    expect(saveMock).not.toHaveBeenCalled();
  });

  it("shows Activo or Apagado", () => {
    renderForm({ ...SETTINGS, emailEnabled: false, whatsappEnabled: false });
    expect(screen.getByText("Apagado.")).toBeDefined();
  });

  it("says how many mails went out today", () => {
    renderForm(SETTINGS, 2);

    expect(screen.getByText("Activo.")).toBeDefined();
    expect(screen.getByText("Hoy salieron 2 mails.")).toBeDefined();
  });

  it("shows the server's field error", async () => {
    saveMock.mockRejectedValue(
      new ApiError({
        statusCode: 400,
        code: "VALIDATION_FAILED",
        message: "Revisá los datos.",
        details: [{ field: "message", messages: ["El mensaje no puede tener ese carácter."] }],
      }),
    );
    renderForm();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => expect(screen.getByText("El mensaje no puede tener ese carácter.")).toBeDefined());
  });
});
