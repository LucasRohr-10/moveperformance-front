import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithSnackbar } from "@/test/render-with-snackbar";

import { ApiError } from "@/lib/api/errors";
import type { ClientFollowupDto } from "@/lib/api/types";

vi.mock("./followup-api", () => ({
  getClientFollowup: vi.fn(),
  endPause: vi.fn(),
  startPause: vi.fn(),
  recordContact: vi.fn(),
  completeContact: vi.fn(),
}));

import { contactFixture, pauseFixture } from "./alert-fixtures";
import { ClientFollowupSection } from "./client-followup-section";
import { completeContact, endPause, getClientFollowup, recordContact, startPause } from "./followup-api";

const getMock = vi.mocked(getClientFollowup);
const endMock = vi.mocked(endPause);
const startMock = vi.mocked(startPause);
const recordMock = vi.mocked(recordContact);
const completeMock = vi.mocked(completeContact);

const activePause = pauseFixture({ note: "Se lesionó la rodilla", recontactOn: "2026-11-01" });
const paused: ClientFollowupDto = { pause: activePause, pauses: [], contacts: [] };
const free: ClientFollowupDto = { pause: null, pauses: [], contacts: [] };

describe("ClientFollowupSection", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    getMock.mockResolvedValue(paused);
  });

  it("shows the active pause status, with the Pausar tab disabled", async () => {
    renderWithSnackbar(<ClientFollowupSection clientId="client-1" />);

    expect(await screen.findByRole("heading", { name: "Seguimiento" })).toBeDefined();
    expect(screen.getByTestId("followup-status").textContent).toContain("Seguimiento pausado");
    expect(screen.getByTestId("followup-detail").textContent).toBe("Lesión · hasta el 01/11/2026");
    expect(screen.getByRole("tab", { name: "Pausar" })).toHaveProperty("disabled", true);
    expect(getMock).toHaveBeenCalledWith("client-1");
  });

  it("shows the free status and lets staff open the Pausar tab", async () => {
    getMock.mockResolvedValue(free);
    renderWithSnackbar(<ClientFollowupSection clientId="client-1" />);

    expect(await screen.findByText("Seguimiento activo")).toBeDefined();
    expect(screen.getByText("Recibís alertas si deja de venir.")).toBeDefined();
    expect(screen.getByRole("tab", { name: "Pausar" })).toHaveProperty("disabled", false);
  });

  it("shows a loading text while it loads", () => {
    getMock.mockReturnValue(new Promise(() => undefined));
    renderWithSnackbar(<ClientFollowupSection clientId="client-1" />);

    expect(screen.getByText("Cargando seguimiento…")).toBeDefined();
  });

  it("ends the pause after confirming inline and refreshes", async () => {
    endMock.mockResolvedValue(activePause);
    renderWithSnackbar(<ClientFollowupSection clientId="client-1" />);
    await userEvent.click(await screen.findByRole("button", { name: "Reanudar" }));
    expect(
      screen.getByText("¿Finalizar la pausa? El cliente vuelve a recibir alertas según su plan y su asistencia."),
    ).toBeDefined();
    getMock.mockResolvedValue(free);

    await userEvent.click(screen.getByRole("button", { name: "Sí, finalizar" }));

    expect(endMock).toHaveBeenCalledWith("client-1");
    expect(await screen.findByText("Seguimiento activo")).toBeDefined();
    expect(screen.getByRole("status").textContent).toContain("Pausa finalizada.");
    expect(screen.queryByRole("button", { name: "Reanudar" })).toBeNull();
  });

  it("does not end the pause when staff goes back", async () => {
    renderWithSnackbar(<ClientFollowupSection clientId="client-1" />);
    const opener = await screen.findByRole("button", { name: "Reanudar" });
    await userEvent.click(opener);

    await userEvent.click(screen.getByRole("button", { name: "Volver" }));

    expect(endMock).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(opener);
    expect(screen.queryByText(/¿Finalizar la pausa\?/)).toBeNull();
  });

  it("explains and refreshes on NO_ACTIVE_PAUSE", async () => {
    endMock.mockRejectedValue(
      new ApiError({ statusCode: 409, code: "NO_ACTIVE_PAUSE", message: "El cliente no tiene una pausa activa." }),
    );
    renderWithSnackbar(<ClientFollowupSection clientId="client-1" />);
    await userEvent.click(await screen.findByRole("button", { name: "Reanudar" }));
    getMock.mockResolvedValue(free);

    await userEvent.click(screen.getByRole("button", { name: "Sí, finalizar" }));

    expect((await screen.findByRole("alert")).textContent).toContain("El cliente no tiene una pausa activa.");
    expect(await screen.findByText("Seguimiento activo")).toBeDefined();
  });

  it("registers a pause from the Pausar tab and switches back to Contactar", async () => {
    getMock.mockResolvedValue(free);
    startMock.mockResolvedValue(pauseFixture());
    renderWithSnackbar(<ClientFollowupSection clientId="client-1" />);
    await userEvent.click(await screen.findByRole("tab", { name: "Pausar" }));
    getMock.mockResolvedValue(paused);

    await userEvent.click(screen.getByRole("radio", { name: "Lesión" }));
    await userEvent.click(screen.getByRole("button", { name: "Pausar seguimiento" }));

    expect(startMock).toHaveBeenCalledWith("client-1", { reason: "injury" });
    expect((await screen.findByTestId("followup-status")).textContent).toContain("Seguimiento pausado");
    expect(screen.getByRole("status").textContent).toContain("Motivo registrado.");
    expect(screen.getByRole("tab", { name: "Contactar" }).getAttribute("aria-selected")).toBe("true");
  });

  it("explains and refreshes when the client already got a pause meanwhile", async () => {
    getMock.mockResolvedValue(free);
    startMock.mockRejectedValue(
      new ApiError({ statusCode: 409, code: "PAUSE_ALREADY_ACTIVE", message: "El cliente ya tiene una pausa activa." }),
    );
    renderWithSnackbar(<ClientFollowupSection clientId="client-1" />);
    await userEvent.click(await screen.findByRole("tab", { name: "Pausar" }));
    getMock.mockResolvedValue(paused);

    await userEvent.click(screen.getByRole("radio", { name: "Lesión" }));
    await userEvent.click(screen.getByRole("button", { name: "Pausar seguimiento" }));

    expect((await screen.findByTestId("followup-status")).textContent).toContain("Seguimiento pausado");
    expect((await screen.findByRole("alert")).textContent).toContain("El cliente ya tiene una pausa activa.");
  });

  it("lists contacts and pauses in one feed, newest first, and says when there is none", async () => {
    getMock.mockResolvedValue({
      ...free,
      contacts: [
        contactFixture({ id: "old", createdAt: "2026-10-01T13:00:00.000Z", note: "Primera vez", channel: "phone", outcome: "no_answer" }),
        contactFixture({ id: "new", createdAt: "2026-10-12T13:05:00.000Z" }),
      ],
    });
    const { unmount } = renderWithSnackbar(<ClientFollowupSection clientId="client-1" />);

    const rows = await screen.findAllByTestId("history-row");
    expect(rows.map((row) => row.textContent)).toEqual([
      "12/10/2026WhatsApp · Habló con la personaLucía Gómez · 12/10/2026 10:05",
      "01/10/2026Teléfono · No respondióPrimera vezLucía Gómez · 01/10/2026 10:00",
    ]);
    unmount();

    getMock.mockResolvedValue(free);
    renderWithSnackbar(<ClientFollowupSection clientId="client-1" />);
    expect(await screen.findByText("Todavía no hay contactos registrados.")).toBeDefined();
  });

  it("shows the active pause and past pauses in the feed", async () => {
    getMock.mockResolvedValue({
      pause: activePause,
      pauses: [pauseFixture({ id: "old-pause", reason: "vacation", startedAt: "2026-08-01T12:00:00.000Z", endedAt: "2026-08-15T12:00:00.000Z" })],
      contacts: [],
    });
    renderWithSnackbar(<ClientFollowupSection clientId="client-1" />);

    const rows = await screen.findAllByTestId("history-row");
    expect(within(rows[0]).getByText("Seguimiento pausado")).toBeDefined();
    expect(within(rows[0]).getByText("Lesión · hasta el 01/11/2026")).toBeDefined();
    expect(within(rows[1]).getByText("Pausa finalizada")).toBeDefined();
    expect(within(rows[1]).getByText("Vacaciones · 01/08/2026 – 15/08/2026")).toBeDefined();
  });

  it("sends a contact from the Contactar tab, closes right away and lists it as pending", async () => {
    getMock.mockResolvedValue(free);
    recordMock.mockResolvedValue(contactFixture({ id: "new", outcome: null }));
    renderWithSnackbar(<ClientFollowupSection clientId="client-1" clientName="Ana Pérez" />);

    getMock.mockResolvedValue({ ...free, contacts: [contactFixture({ id: "new", outcome: null })] });
    await userEvent.click(await screen.findByRole("button", { name: "Registrar envío" }));

    expect(recordMock).toHaveBeenCalledWith("client-1", { channel: "whatsapp" });
    expect(screen.getByRole("status").textContent).toContain(
      "Contacto registrado. Vas a poder cargar el resultado desde la lista.",
    );
    expect(await screen.findByText("Pendiente de resultado")).toBeDefined();
  });

  it("shows a pending contact with an inline action to complete its outcome", async () => {
    getMock.mockResolvedValue({ ...free, contacts: [contactFixture({ id: "pending-1", outcome: null })] });
    completeMock.mockResolvedValue(contactFixture({ id: "pending-1" }));
    renderWithSnackbar(<ClientFollowupSection clientId="client-1" clientName="Ana Pérez" />);

    expect(await screen.findByText("Pendiente de resultado")).toBeDefined();
    await userEvent.click(screen.getByRole("button", { name: "Completar resultado" }));
    await userEvent.click(screen.getByRole("button", { name: "Guardar resultado" }));

    expect(completeMock).toHaveBeenCalledWith("client-1", "pending-1", { outcome: "reached" });
  });

  it("shows an error with retry when the follow-up cannot be loaded", async () => {
    getMock.mockRejectedValueOnce(new Error("boom"));
    renderWithSnackbar(<ClientFollowupSection clientId="client-1" />);

    expect(await screen.findByText("No pudimos cargar el seguimiento.")).toBeDefined();
    getMock.mockResolvedValue(paused);
    await userEvent.click(screen.getByRole("button", { name: "Reintentar" }));

    expect((await screen.findByTestId("followup-status")).textContent).toContain("Seguimiento pausado");
  });
});
