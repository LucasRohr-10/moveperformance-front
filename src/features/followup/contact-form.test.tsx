import { fireEvent, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithSnackbar } from "@/test/render-with-snackbar";

import { ApiError } from "@/lib/api/errors";

vi.mock("./followup-api", () => ({ recordContact: vi.fn(), completeContact: vi.fn() }));

import { ContactForm } from "./contact-form";
import { completeContact, recordContact } from "./followup-api";

const recordMock = vi.mocked(recordContact);
const completeMock = vi.mocked(completeContact);

const onDone = vi.fn();
const onCancel = vi.fn();

const SENT_CONTACT = {
  id: "c-1",
  channel: "whatsapp",
  outcome: null,
  note: null,
  staffName: "Lucía Gómez",
  alertType: "expiring",
  createdAt: "2026-10-12T10:00:00.000Z",
} as const;

function renderForm(props: Partial<ComponentProps<typeof ContactForm>> = {}) {
  renderWithSnackbar(
    <ContactForm
      clientId="client-1"
      clientName="Ana Pérez"
      alertId="alert-1"
      onDone={onDone}
      onCancel={onCancel}
      {...props}
    />,
  );
}

const sendButton = () => userEvent.click(screen.getByRole("button", { name: /Registrar envío|Continuar/ }));
const save = () => userEvent.click(screen.getByRole("button", { name: "Guardar resultado" }));

describe("ContactForm", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    recordMock.mockResolvedValue(SENT_CONTACT);
    completeMock.mockResolvedValue({ ...SENT_CONTACT, outcome: "reached" });
  });

  describe("phase 1 — send", () => {
    it("explains what it is for and starts on WhatsApp with a composed message", () => {
      renderForm();

      expect(screen.getByRole("group", { name: "Contactar a Ana Pérez" })).toBeDefined();
      expect((screen.getByLabelText("Canal") as HTMLSelectElement).value).toBe("whatsapp");
      expect((screen.getByLabelText("Mensaje") as HTMLTextAreaElement).value).toContain("Ana Pérez");
    });

    it("puts the focus on the channel select when it opens", () => {
      renderForm();

      expect(document.activeElement).toBe(screen.getByLabelText("Canal"));
    });

    it("hides the message composer for phone and in-person", async () => {
      renderForm();

      await userEvent.selectOptions(screen.getByLabelText("Canal"), "En persona");

      expect(screen.queryByLabelText("Mensaje")).toBeNull();
      expect(screen.queryByLabelText("Plantilla")).toBeNull();
    });

    it("fills the message from the selected template", async () => {
      renderForm();

      await userEvent.selectOptions(screen.getByLabelText("Plantilla"), "Pago pendiente");

      expect((screen.getByLabelText("Mensaje") as HTMLTextAreaElement).value).toContain("pago pendiente");
    });

    it("opens wa.me with the composed message when the phone is known", async () => {
      renderForm({ clientPhone: "+598 99 123 456" });

      const link = screen.getByRole("link", { name: "Abrir en WhatsApp" });
      expect(link.getAttribute("href")).toBe(
        `https://wa.me/59899123456?text=${encodeURIComponent((screen.getByLabelText("Mensaje") as HTMLTextAreaElement).value)}`,
      );
      expect(link.getAttribute("target")).toBe("_blank");

      await userEvent.click(link);

      expect(recordMock).toHaveBeenCalledWith("client-1", { channel: "whatsapp", alertId: "alert-1" });
    });

    it("falls back to a plain button and a generic label when there's no contact info", async () => {
      renderForm();

      expect(screen.queryByRole("link")).toBeNull();
      await sendButton();

      expect(recordMock).toHaveBeenCalledWith("client-1", { channel: "whatsapp", alertId: "alert-1" });
    });

    it("works without an alert, e.g. from the client's own page", async () => {
      renderForm({ alertId: undefined });

      await sendButton();

      expect(recordMock).toHaveBeenCalledWith("client-1", { channel: "whatsapp" });
    });

    it("sends the composed message as the note when the channel is email, with the selected template", async () => {
      renderForm();

      await userEvent.selectOptions(screen.getByLabelText("Canal"), "Email");
      const message = (screen.getByLabelText("Mensaje") as HTMLTextAreaElement).value;
      await userEvent.click(screen.getByRole("button", { name: "Enviar email" }));

      expect(recordMock).toHaveBeenCalledWith("client-1", {
        channel: "email",
        alertId: "alert-1",
        note: message,
        template: "reminder",
      });
    });

    it("sends the template matching the plantilla picked, e.g. payment", async () => {
      renderForm();

      await userEvent.selectOptions(screen.getByLabelText("Canal"), "Email");
      await userEvent.selectOptions(screen.getByLabelText("Plantilla"), "Pago pendiente");
      await userEvent.click(screen.getByRole("button", { name: "Enviar email" }));

      expect(recordMock).toHaveBeenCalledWith(
        "client-1",
        expect.objectContaining({ template: "payment" }),
      );
    });

    it("disables sending an email with an empty message", async () => {
      renderForm();

      await userEvent.selectOptions(screen.getByLabelText("Canal"), "Email");
      await userEvent.selectOptions(screen.getByLabelText("Plantilla"), "Mensaje libre");

      expect(screen.getByRole("button", { name: "Enviar email" })).toHaveProperty("disabled", true);
      expect(recordMock).not.toHaveBeenCalled();
    });

    it("closes with a notice once the send succeeds, without asking for the outcome here", async () => {
      renderForm();

      await sendButton();

      expect(onDone).toHaveBeenCalledWith({
        ok: true,
        message: "Contacto registrado. Vas a poder cargar el resultado desde la lista.",
      });
      // The outcome is logged later, from the contacts list — never in this same form.
      expect(screen.queryByRole("group", { name: /¿Cómo fue el contacto/ })).toBeNull();
    });

    it("shows an error and stays in phase 1 when the send fails", async () => {
      recordMock.mockRejectedValue(new TypeError("Failed to fetch"));
      renderForm();

      await sendButton();

      expect((await screen.findByRole("alert")).textContent).toContain("No pudimos registrar el envío. Probá de nuevo.");
      expect(screen.getByRole("group", { name: "Contactar a Ana Pérez" })).toBeDefined();
    });

    it("goes back without sending", async () => {
      renderForm();

      await userEvent.click(screen.getByRole("button", { name: "Volver" }));

      expect(onCancel).toHaveBeenCalled();
      expect(recordMock).not.toHaveBeenCalled();
    });
  });

  describe("phase 2 — log the outcome", () => {
    function renderPhase2() {
      renderForm({ completing: { contactId: "c-1", channel: "phone" } });
    }

    it("skips phase 1 entirely and focuses the outcome select", () => {
      renderPhase2();

      expect(screen.getByRole("group", { name: "¿Cómo fue el contacto con Ana Pérez?" })).toBeDefined();
      expect(screen.queryByLabelText("Canal")).toBeNull();
      expect(document.activeElement).toBe(screen.getByLabelText("Resultado"));
    });

    it("saves the outcome and note", async () => {
      renderPhase2();

      await userEvent.selectOptions(screen.getByLabelText("Resultado"), "No respondió");
      await userEvent.type(screen.getByLabelText("Nota (opcional)"), "Llamé a las 18");
      await save();

      expect(completeMock).toHaveBeenCalledWith("client-1", "c-1", {
        outcome: "no_answer",
        note: "Llamé a las 18",
      });
      expect(onDone).toHaveBeenCalledWith({ ok: true, message: "Resultado guardado." });
    });

    it("sends no note when the field is empty", async () => {
      renderPhase2();

      await save();

      expect(completeMock.mock.calls[0][2]).not.toHaveProperty("note");
    });

    it("rejects a note over 1000 characters without calling the API", async () => {
      renderPhase2();

      fireEvent.change(screen.getByLabelText("Nota (opcional)"), { target: { value: "a".repeat(1001) } });
      await save();

      expect((await screen.findByRole("alert")).textContent).toContain("La nota es demasiado larga (máximo 1000 caracteres).");
      expect(completeMock).not.toHaveBeenCalled();
    });

    it("shows the API field errors under their fields", async () => {
      completeMock.mockRejectedValue(
        new ApiError({
          statusCode: 400,
          code: "VALIDATION_FAILED",
          message: "Los datos enviados no son válidos.",
          details: [{ field: "note", messages: ["La nota no es válida."] }],
        }),
      );
      renderPhase2();

      await save();

      expect((await screen.findByRole("alert")).textContent).toContain("La nota no es válida.");
      expect(onDone).not.toHaveBeenCalled();
    });

    it("shows the message of the API and keeps the form open when saving fails", async () => {
      completeMock.mockRejectedValue(
        new ApiError({ statusCode: 409, code: "CONTACT_ALREADY_COMPLETED", message: "Este contacto ya tiene un resultado cargado." }),
      );
      renderPhase2();

      await save();

      expect((await screen.findByRole("alert")).textContent).toContain("Este contacto ya tiene un resultado cargado.");
      expect(screen.getByRole("button", { name: "Guardar resultado" })).toBeDefined();
    });

    it("saves once with a double click", async () => {
      let finish: () => void = () => undefined;
      completeMock.mockReturnValue(new Promise((resolve) => (finish = () => resolve({} as never))));
      renderPhase2();

      await userEvent.dblClick(screen.getByRole("button", { name: "Guardar resultado" }));
      finish();

      expect(completeMock).toHaveBeenCalledTimes(1);
    });

    it("goes back without saving", async () => {
      renderPhase2();

      await userEvent.click(screen.getByRole("button", { name: "Volver" }));

      expect(onCancel).toHaveBeenCalled();
      expect(completeMock).not.toHaveBeenCalled();
    });
  });
});
