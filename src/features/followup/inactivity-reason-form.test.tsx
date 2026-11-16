import { fireEvent, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithSnackbar } from "@/test/render-with-snackbar";

import { ApiError } from "@/lib/api/errors";

vi.mock("./followup-api", () => ({ startPause: vi.fn() }));

import { startPause } from "./followup-api";
import { InactivityReasonForm } from "./inactivity-reason-form";

const startMock = vi.mocked(startPause);

const onDone = vi.fn();
const onCancel = vi.fn();

function renderForm() {
  renderWithSnackbar(<InactivityReasonForm clientId="client-1" onDone={onDone} onCancel={onCancel} />);
}

const submit = () => userEvent.click(screen.getByRole("button", { name: "Guardar" }));

describe("InactivityReasonForm", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    startMock.mockResolvedValue({
      id: "p-1",
      reason: "injury",
      note: null,
      recontactOn: null,
      startedAt: "2026-10-12T10:00:00.000Z",
      endedAt: null,
      createdByName: "Lucía Gómez",
    });
  });

  it("explains that the client is paused and lists the reasons as options", () => {
    renderForm();

    expect(screen.getByRole("group", { name: "Registrar motivo de inactividad" })).toBeDefined();
    expect(
      screen.getByText("Registrar un motivo pausa al cliente: no recibe alertas hasta que finalice la pausa."),
    ).toBeDefined();
    const reasons = screen.getByRole("group", { name: "Motivo" });
    expect(reasons.querySelectorAll('input[type="radio"]')).toHaveLength(6);
    expect(screen.getByLabelText("Quiere volver más adelante")).toBeDefined();
  });

  it("puts the focus on the first control when it opens", () => {
    renderForm();

    expect(document.activeElement).toBe(screen.getByLabelText("Lesión"));
  });

  it("requires a reason and a re-contact date that is not in the past", async () => {
    renderForm();

    await submit();
    expect((await screen.findByRole("alert")).textContent).toContain("Elegí un motivo.");

    await userEvent.click(screen.getByLabelText("Lesión"));
    fireEvent.change(screen.getByLabelText("Fecha de re-contacto (opcional)"), { target: { value: "2000-01-01" } });
    await submit();

    expect((await screen.findByRole("alert")).textContent).toContain("La fecha de re-contacto no puede ser anterior a hoy.");
    expect(startMock).not.toHaveBeenCalled();
  });

  it("sends the reason with the re-contact date and closes the form", async () => {
    renderForm();

    await userEvent.click(screen.getByLabelText("Vacaciones"));
    await userEvent.type(screen.getByLabelText("Nota interna (opcional)"), "Viaja a Europa");
    fireEvent.change(screen.getByLabelText("Fecha de re-contacto (opcional)"), { target: { value: "2099-01-01" } });
    await submit();

    expect(startMock).toHaveBeenCalledWith("client-1", {
      reason: "vacation",
      note: "Viaja a Europa",
      recontactOn: "2099-01-01",
    });
    expect(onDone).toHaveBeenCalledWith({ ok: true, message: "Motivo registrado." });
  });

  it("sends only the reason when nothing else is filled", async () => {
    renderForm();

    await userEvent.click(screen.getByLabelText("Mudanza"));
    await submit();

    expect(startMock).toHaveBeenCalledWith("client-1", { reason: "moving" });
  });

  it("rejects a note over 1000 characters without calling the API", async () => {
    renderForm();

    await userEvent.click(screen.getByLabelText("Lesión"));
    fireEvent.change(screen.getByLabelText("Nota interna (opcional)"), { target: { value: "a".repeat(1001) } });
    await submit();

    expect((await screen.findByRole("alert")).textContent).toContain("La nota es demasiado larga (máximo 1000 caracteres).");
    expect(startMock).not.toHaveBeenCalled();
  });

  it("reports the contract message upward when the client already has a pause", async () => {
    startMock.mockRejectedValue(
      new ApiError({ statusCode: 409, code: "PAUSE_ALREADY_ACTIVE", message: "El cliente ya tiene una pausa activa." }),
    );
    renderForm();

    await userEvent.click(screen.getByLabelText("Lesión"));
    await submit();

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
    renderForm();

    await userEvent.click(screen.getByLabelText("Lesión"));
    await submit();

    expect((await screen.findByRole("alert")).textContent).toContain("La fecha no es válida.");
  });

  it("goes back without saving", async () => {
    renderForm();

    await userEvent.click(screen.getByRole("button", { name: "Volver" }));

    expect(onCancel).toHaveBeenCalled();
  });
});
