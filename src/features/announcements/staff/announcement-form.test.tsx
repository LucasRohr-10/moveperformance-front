import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { businessDateOf } from "@/features/checkout/business-time";
import { ApiError } from "@/lib/api/errors";
import type { AnnouncementDto } from "@/lib/api/types";
import { renderWithSnackbar } from "@/test/render-with-snackbar";

import { AnnouncementForm } from "./announcement-form";
import { editAnnouncement, publishAnnouncement } from "./staff-announcements-api";

vi.mock("./staff-announcements-api");

const publishMock = vi.mocked(publishAnnouncement);
const editMock = vi.mocked(editAnnouncement);

const TODAY = businessDateOf(new Date().toISOString());
const FUTURE = "2099-12-31";

function announcement(overrides: Partial<AnnouncementDto> = {}): AnnouncementDto {
  return {
    id: "a-1",
    body: "Feriado: abrimos de 8 a 14.",
    visibleUntil: FUTURE,
    createdAt: "2026-10-27T12:00:00.000Z",
    createdByName: "Valentina",
    updatedAt: "2026-10-27T12:00:00.000Z",
    updatedByName: null,
    ...overrides,
  };
}

const onSaved = vi.fn();
const onCancel = vi.fn();

function renderForm(original?: AnnouncementDto) {
  return renderWithSnackbar(<AnnouncementForm original={original} onSaved={onSaved} onCancel={original ? onCancel : undefined} />);
}

function messageField(): HTMLTextAreaElement {
  return screen.getByLabelText("Mensaje") as HTMLTextAreaElement;
}

function dateField(): HTMLInputElement {
  return screen.getByLabelText("Visible hasta") as HTMLInputElement;
}

function confirmDialog(): HTMLElement {
  return screen.getByRole("dialog");
}

// The form's own Publicar opens the dialog; the one inside it sends.
function clickPublish(): void {
  fireEvent.click(screen.getByRole("button", { name: "Publicar" }));
}

function confirmPublish(): void {
  fireEvent.click(within(confirmDialog()).getByRole("button", { name: "Publicar" }));
}

describe("AnnouncementForm", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    publishMock.mockResolvedValue(announcement());
    editMock.mockResolvedValue(announcement());
  });

  it("publishes and calls onSaved", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.type(messageField(), "  Feriado  ");
    fireEvent.change(dateField(), { target: { value: FUTURE } });
    await user.click(screen.getByRole("button", { name: "Publicar" }));
    await user.click(within(confirmDialog()).getByRole("button", { name: "Publicar" }));

    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(announcement()));
    expect(publishMock).toHaveBeenCalledWith({ body: "Feriado", visibleUntil: FUTURE });
    expect(screen.getByText("Comunicado publicado.")).toBeDefined();
    expect(messageField().value).toBe("");
    expect(dateField().value).toBe("");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("asks before publishing: says it reaches everyone, until when, and shows the message", async () => {
    renderForm();
    fireEvent.change(messageField(), { target: { value: "  El lunes abrimos de 8 a 14.  " } });
    fireEvent.change(dateField(), { target: { value: "2099-12-31" } });

    clickPublish();

    const dialog = confirmDialog();
    expect(within(dialog).getByText("¿Publicar a todos los clientes?")).toBeDefined();
    expect(dialog.textContent).toContain("Lo van a ver todos en la campanita hasta el jueves 31 de diciembre.");
    expect(within(dialog).getByText("El lunes abrimos de 8 a 14.")).toBeDefined();
    expect(publishMock).not.toHaveBeenCalled();
  });

  it("Volver closes the dialog, sends nothing and keeps what was typed", async () => {
    const user = userEvent.setup();
    renderForm();
    fireEvent.change(messageField(), { target: { value: "Feriado" } });
    fireEvent.change(dateField(), { target: { value: FUTURE } });
    clickPublish();

    await user.click(within(confirmDialog()).getByRole("button", { name: "Volver" }));

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(publishMock).not.toHaveBeenCalled();
    expect(messageField().value).toBe("Feriado");
    expect(dateField().value).toBe(FUTURE);
  });

  it("counts the characters of the message", async () => {
    renderForm();

    expect(screen.getByText("0/500")).toBeDefined();
    await userEvent.setup().type(messageField(), "Hola");

    expect(screen.getByText("4/500")).toBeDefined();
  });

  it("does not allow past dates in the picker", () => {
    renderForm();

    expect(dateField().min).toBe(TODAY);
  });

  it("warns about the empty fields without sending anything", async () => {
    renderForm();

    await userEvent.setup().click(screen.getByRole("button", { name: "Publicar" }));

    expect(screen.getByText("Escribí el mensaje.")).toBeDefined();
    expect(screen.getByText("Elegí una fecha.")).toBeDefined();
    expect(publishMock).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("sends once when the dialog's Publicar is clicked twice in a row", async () => {
    let finish: (value: AnnouncementDto) => void = () => {};
    publishMock.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    renderForm();
    fireEvent.change(messageField(), { target: { value: "Feriado" } });
    fireEvent.change(dateField(), { target: { value: FUTURE } });
    clickPublish();

    const publish = within(confirmDialog()).getByRole("button", { name: "Publicar" });
    fireEvent.click(publish);
    fireEvent.click(publish);
    finish(announcement());

    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
    expect(publishMock).toHaveBeenCalledTimes(1);
  });

  it("shows back field errors", async () => {
    publishMock.mockRejectedValue(
      new ApiError({
        statusCode: 400,
        code: "VALIDATION_FAILED",
        message: "Los datos enviados no son válidos.",
        details: [{ field: "visibleUntil", messages: ["Elegí hoy o una fecha posterior."] }],
      }),
    );
    renderForm();
    fireEvent.change(messageField(), { target: { value: "Feriado" } });
    fireEvent.change(dateField(), { target: { value: FUTURE } });

    clickPublish();
    confirmPublish();

    expect(await screen.findByText("Elegí hoy o una fecha posterior.")).toBeDefined();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(onSaved).not.toHaveBeenCalled();
  });

  it("tells a failure with no field in a snackbar and keeps what was typed", async () => {
    publishMock.mockRejectedValue(new Error("offline"));
    renderForm();
    fireEvent.change(messageField(), { target: { value: "Feriado" } });
    fireEvent.change(dateField(), { target: { value: FUTURE } });

    clickPublish();
    confirmPublish();

    expect(await screen.findByText("No pudimos guardar el comunicado. Probá de nuevo.")).toBeDefined();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(messageField().value).toBe("Feriado");
  });

  it("edit loads the announcement and sends only changed fields", async () => {
    const user = userEvent.setup();
    renderForm(announcement());
    expect(messageField().value).toBe("Feriado: abrimos de 8 a 14.");
    expect(dateField().value).toBe(FUTURE);

    await user.clear(messageField());
    await user.type(messageField(), "Nuevo texto");
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
    expect(editMock).toHaveBeenCalledWith("a-1", { body: "Nuevo texto" });
    expect(screen.getByText("Cambios guardados.")).toBeDefined();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("edit sends only the date when only the date changed", async () => {
    renderForm(announcement());

    fireEvent.change(dateField(), { target: { value: "2099-12-30" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() => expect(editMock).toHaveBeenCalledWith("a-1", { visibleUntil: "2099-12-30" }));
  });

  it("edit with nothing changed sends nothing and closes", async () => {
    renderForm(announcement());

    await userEvent.setup().click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(editMock).not.toHaveBeenCalled();
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("editing an expired announcement without touching the date shows no date error and saves", async () => {
    renderForm(announcement({ visibleUntil: "2026-09-15", body: "Cerramos el 15." }));

    fireEvent.change(messageField(), { target: { value: "Cerramos el 15 de septiembre." } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() => expect(editMock).toHaveBeenCalledWith("a-1", { body: "Cerramos el 15 de septiembre." }));
    expect(screen.queryByText("Elegí hoy o una fecha posterior.")).toBeNull();
  });

  it("editing an expired announcement with another past date shows the date error", async () => {
    renderForm(announcement({ visibleUntil: "2026-09-15" }));

    fireEvent.change(dateField(), { target: { value: "2026-09-20" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(await screen.findByText("Elegí hoy o una fecha posterior.")).toBeDefined();
    expect(editMock).not.toHaveBeenCalled();
  });

  it("Cancelar calls onCancel", async () => {
    renderForm(announcement());

    await userEvent.setup().click(screen.getByRole("button", { name: "Cancelar" }));

    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
