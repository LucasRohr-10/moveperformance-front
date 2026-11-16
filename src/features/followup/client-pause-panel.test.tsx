import { fireEvent, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithSnackbar } from "@/test/render-with-snackbar";

import { ApiError } from "@/lib/api/errors";

vi.mock("./followup-api", () => ({ startPause: vi.fn() }));

import { ClientPausePanel } from "./client-pause-panel";
import { startPause } from "./followup-api";

const startMock = vi.mocked(startPause);
const onDone = vi.fn();

function renderPanel() {
  renderWithSnackbar(<ClientPausePanel clientId="client-1" onDone={onDone} />);
}

describe("ClientPausePanel", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    startMock.mockResolvedValue({
      id: "p-1",
      reason: "injury",
      note: null,
      recontactOn: null,
      startedAt: "2026-10-28T10:00:00.000Z",
      endedAt: null,
      createdByName: "Lucía Gómez",
    });
  });

  it("lists the six reasons and keeps the submit disabled until one is picked", () => {
    renderPanel();

    const reasons = screen.getByRole("radiogroup", { name: "Motivo" });
    expect(reasons.querySelectorAll('[role="radio"]')).toHaveLength(6);
    expect(screen.getByRole("button", { name: "Pausar seguimiento" })).toHaveProperty("disabled", true);
  });

  it("fills the date from a preset and shows the re-contact hint", async () => {
    renderPanel();

    await userEvent.click(screen.getByRole("button", { name: "2 semanas" }));

    const date = screen.getByLabelText("Fecha de re-contacto (opcional)") as HTMLInputElement;
    expect(date.value).not.toBe("");
    expect(screen.getByText(/Te avisamos el/)).toBeDefined();
  });

  it("sends the reason with the picked date and note, then closes", async () => {
    renderPanel();

    await userEvent.click(screen.getByRole("radio", { name: "Vacaciones" }));
    await userEvent.type(screen.getByLabelText("Nota interna · opcional"), "Viaja a Europa");
    fireEvent.change(screen.getByLabelText("Fecha de re-contacto (opcional)"), { target: { value: "2099-01-01" } });
    await userEvent.click(screen.getByRole("button", { name: "Pausar seguimiento" }));

    expect(startMock).toHaveBeenCalledWith("client-1", {
      reason: "vacation",
      note: "Viaja a Europa",
      recontactOn: "2099-01-01",
    });
    expect(onDone).toHaveBeenCalledWith({ ok: true, message: "Motivo registrado." });
  });

  it("sends only the reason when nothing else is filled", async () => {
    renderPanel();

    await userEvent.click(screen.getByRole("radio", { name: "Mudanza" }));
    await userEvent.click(screen.getByRole("button", { name: "Pausar seguimiento" }));

    expect(startMock).toHaveBeenCalledWith("client-1", { reason: "moving" });
  });

  it("rejects a note over 1000 characters without calling the API", async () => {
    renderPanel();

    await userEvent.click(screen.getByRole("radio", { name: "Lesión" }));
    fireEvent.change(screen.getByLabelText("Nota interna · opcional"), { target: { value: "a".repeat(1001) } });
    await userEvent.click(screen.getByRole("button", { name: "Pausar seguimiento" }));

    expect((await screen.findByRole("alert")).textContent).toContain(
      "La nota es demasiado larga (máximo 1000 caracteres).",
    );
    expect(startMock).not.toHaveBeenCalled();
  });

  it("rejects a re-contact date in the past", async () => {
    renderPanel();

    await userEvent.click(screen.getByRole("radio", { name: "Lesión" }));
    fireEvent.change(screen.getByLabelText("Fecha de re-contacto (opcional)"), { target: { value: "2000-01-01" } });
    await userEvent.click(screen.getByRole("button", { name: "Pausar seguimiento" }));

    expect((await screen.findByRole("alert")).textContent).toContain(
      "La fecha de re-contacto no puede ser anterior a hoy.",
    );
    expect(startMock).not.toHaveBeenCalled();
  });

  it("reports the contract message upward when the client already has a pause", async () => {
    startMock.mockRejectedValue(
      new ApiError({ statusCode: 409, code: "PAUSE_ALREADY_ACTIVE", message: "El cliente ya tiene una pausa activa." }),
    );
    renderPanel();

    await userEvent.click(screen.getByRole("radio", { name: "Lesión" }));
    await userEvent.click(screen.getByRole("button", { name: "Pausar seguimiento" }));

    await vi.waitFor(() =>
      expect(onDone).toHaveBeenCalledWith({ ok: false, message: "El cliente ya tiene una pausa activa." }),
    );
  });

  it("shows the API field errors under their fields", async () => {
    startMock.mockRejectedValue(
      new ApiError({
        statusCode: 400,
        code: "VALIDATION_FAILED",
        message: "Los datos enviados no son válidos.",
        details: [{ field: "recontactOn", messages: ["La fecha no es válida."] }],
      }),
    );
    renderPanel();

    await userEvent.click(screen.getByRole("radio", { name: "Lesión" }));
    await userEvent.click(screen.getByRole("button", { name: "Pausar seguimiento" }));

    expect((await screen.findByRole("alert")).textContent).toContain("La fecha no es válida.");
  });
});
