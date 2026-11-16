import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithSnackbar } from "@/test/render-with-snackbar";

vi.mock("./followup-api", () => ({ recordContact: vi.fn() }));

import { ClientContactPanel } from "./client-contact-panel";
import { recordContact } from "./followup-api";

const recordMock = vi.mocked(recordContact);
const onSent = vi.fn();

function renderPanel(props: Partial<Parameters<typeof ClientContactPanel>[0]> = {}) {
  renderWithSnackbar(
    <ClientContactPanel clientId="client-1" clientName="Ana Pérez" onSent={onSent} {...props} />,
  );
}

describe("ClientContactPanel", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    recordMock.mockResolvedValue({
      id: "c-1",
      channel: "whatsapp",
      outcome: null,
      note: null,
      staffName: "Lucía Gómez",
      alertType: null,
      createdAt: "2026-10-28T10:00:00.000Z",
    });
  });

  it("starts on WhatsApp with a composed message from the reminder template", () => {
    renderPanel();

    expect(screen.getByRole("radio", { name: "WhatsApp" }).getAttribute("aria-checked")).toBe("true");
    expect((screen.getByLabelText("Mensaje") as HTMLTextAreaElement).value).toContain("Ana Pérez");
  });

  it("hides the message composer for phone and in-person, with a manual hint", async () => {
    renderPanel({ clientPhone: "+59899123456" });

    await userEvent.click(screen.getByRole("radio", { name: "En persona" }));

    expect(screen.queryByLabelText("Mensaje")).toBeNull();
    expect(screen.getByText("Registrá la conversación que tuviste en la sala.")).toBeDefined();
  });

  it("fills the message from the selected template", async () => {
    renderPanel();

    await userEvent.click(screen.getByRole("radio", { name: /Pago pendiente/ }));

    expect((screen.getByLabelText("Mensaje") as HTMLTextAreaElement).value).toContain("pago pendiente");
  });

  it("opens wa.me with the composed message when the phone is known", async () => {
    renderPanel({ clientPhone: "+598 99 123 456" });

    const link = screen.getByRole("link", { name: /Abrir en WhatsApp/ });
    const message = (screen.getByLabelText("Mensaje") as HTMLTextAreaElement).value;
    expect(link.getAttribute("href")).toBe(`https://wa.me/59899123456?text=${encodeURIComponent(message)}`);

    await userEvent.click(link);

    expect(recordMock).toHaveBeenCalledWith("client-1", { channel: "whatsapp" });
    expect(onSent).toHaveBeenCalledWith({
      ok: true,
      message: "Contacto registrado. Vas a poder cargar el resultado desde la lista.",
    });
  });

  it("falls back to registering the send when there's no phone on file", async () => {
    renderPanel();

    expect(screen.queryByRole("link")).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Registrar envío" }));

    expect(recordMock).toHaveBeenCalledWith("client-1", { channel: "whatsapp" });
  });

  it("shows the known email as the recipient and sends the composed message as the note", async () => {
    renderPanel({ clientEmail: "ana@example.com" });

    await userEvent.click(screen.getByRole("radio", { name: "Email" }));
    expect(screen.getByText("Para ana@example.com")).toBeDefined();
    const message = (screen.getByLabelText("Mensaje") as HTMLTextAreaElement).value;

    await userEvent.click(screen.getByRole("button", { name: "Abrir en email" }));

    expect(recordMock).toHaveBeenCalledWith("client-1", {
      channel: "email",
      note: message,
      template: "reminder",
    });
  });

  it("disables sending an email with an empty message", async () => {
    renderPanel();

    await userEvent.click(screen.getByRole("radio", { name: "Email" }));
    await userEvent.click(screen.getByRole("radio", { name: /Mensaje libre/ }));

    expect(screen.getByRole("button", { name: "Abrir en email" })).toHaveProperty("disabled", true);
    expect(recordMock).not.toHaveBeenCalled();
  });

  it("shows an error when the send fails", async () => {
    recordMock.mockRejectedValue(new Error("boom"));
    renderPanel();

    await userEvent.click(screen.getByRole("button", { name: "Registrar envío" }));

    expect((await screen.findByRole("alert")).textContent).toContain("No pudimos registrar el envío. Probá de nuevo.");
    expect(onSent).not.toHaveBeenCalled();
  });
});
