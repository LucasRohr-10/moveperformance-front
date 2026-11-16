import { act, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithSnackbar } from "@/test/render-with-snackbar";

vi.mock("./followup-api", () => ({ recordContact: vi.fn(), completeContact: vi.fn(), startPause: vi.fn() }));

import { ApiError } from "@/lib/api/errors";

import { alertFixture } from "./alert-fixtures";
import { AlertRow } from "./alert-row";
import { completeContact, recordContact, startPause } from "./followup-api";

const TODAY = "2026-10-16";
const NOTHING = { today: TODAY, onHandle: vi.fn(), onChanged: vi.fn(), onRefresh: vi.fn() };

const openMenu = () => userEvent.click(screen.getByRole("button", { name: "Más acciones" }));

describe("AlertRow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the key fact of an expiring alert", () => {
    renderWithSnackbar(<AlertRow alert={alertFixture({ endsOn: "2026-10-18" })} {...NOTHING} />);

    expect(screen.getByText("Ana Pérez")).toBeDefined();
    expect(screen.getByText("AP")).toBeDefined();
    expect(screen.getByText("Plan Mensual")).toBeDefined();
    expect(screen.getByText("Plan por vencer")).toBeDefined();
    expect(screen.getByText("Vence en 2 días")).toBeDefined();
    expect(screen.getByText("El plan Mensual vence el 18/10/2026.")).toBeDefined();
    expect(screen.getByText("08/10")).toBeDefined();
  });

  it("keeps the last attendance labelled for screen readers when the table header is hidden from them", () => {
    renderWithSnackbar(<AlertRow alert={alertFixture()} {...NOTHING} />);

    expect(screen.getByText("Última asistencia").className).toContain("xl:sr-only");
  });

  it("says there is no last attendance", () => {
    renderWithSnackbar(<AlertRow alert={alertFixture({ lastAttendanceOn: null })} {...NOTHING} />);

    expect(screen.getByText("Sin registro")).toBeDefined();
  });

  it("shows the quote of a check-in alert", () => {
    const pain = alertFixture({
      type: "checkin_pain",
      checkin: { id: "c-1", painDetail: "Me molesta la rodilla", goalsDetail: null },
    });
    renderWithSnackbar(<AlertRow alert={pain} {...NOTHING} />);

    expect(screen.getByText("“Me molesta la rodilla”")).toBeDefined();
    expect(screen.getByText("Respondió en el check-in")).toBeDefined();
  });

  describe("WhatsApp", () => {
    it("opens the client's chat and registers the contact once, even with a double click", async () => {
      let finish: (contact: never) => void = () => undefined;
      vi.mocked(recordContact).mockReturnValue(new Promise((resolve) => (finish = resolve)));
      const onChanged = vi.fn();
      const onRefresh = vi.fn();
      renderWithSnackbar(<AlertRow alert={alertFixture()} today={TODAY} onHandle={vi.fn()} onChanged={onChanged} onRefresh={onRefresh} />);

      const link = screen.getByRole("link", { name: "Escribir por WhatsApp a Ana Pérez" });
      expect(link.getAttribute("href")).toBe("https://wa.me/59899123456");
      expect(link.getAttribute("target")).toBe("_blank");
      await userEvent.dblClick(link);
      await act(async () => finish({ id: "c-1" } as never));

      expect(recordContact).toHaveBeenCalledTimes(1);
      expect(recordContact).toHaveBeenCalledWith("client-1", { channel: "whatsapp", alertId: "alert-1" });
      expect(onChanged).toHaveBeenCalledWith({
        ok: true,
        message: "Contacto registrado. Vas a poder cargar el resultado desde la lista.",
      });
      expect(onRefresh).toHaveBeenCalled();
      // Logging how it went happens later, from the client's own contacts list — not here.
      expect(completeContact).not.toHaveBeenCalled();
    });

    it("reports a failed registration without refreshing", async () => {
      vi.mocked(recordContact).mockRejectedValue(new Error("boom"));
      const onChanged = vi.fn();
      const onRefresh = vi.fn();
      renderWithSnackbar(<AlertRow alert={alertFixture()} today={TODAY} onHandle={vi.fn()} onChanged={onChanged} onRefresh={onRefresh} />);

      await userEvent.click(screen.getByRole("link", { name: "Escribir por WhatsApp a Ana Pérez" }));

      expect(onChanged).toHaveBeenCalledWith({
        ok: false,
        message: 'Se abrió WhatsApp, pero no pudimos registrar el contacto. Registralo desde "Otro canal de contacto".',
      });
      expect(onRefresh).not.toHaveBeenCalled();
    });

    it("refreshes and says why when the alert was already handled by someone else", async () => {
      vi.mocked(recordContact).mockRejectedValue(
        new ApiError({
          statusCode: 409,
          code: "ALERT_ALREADY_HANDLED",
          message: "Otra persona del equipo ya gestionó esta alerta.",
        }),
      );
      const onChanged = vi.fn();
      const onRefresh = vi.fn();
      renderWithSnackbar(<AlertRow alert={alertFixture()} today={TODAY} onHandle={vi.fn()} onChanged={onChanged} onRefresh={onRefresh} />);

      await userEvent.click(screen.getByRole("link", { name: "Escribir por WhatsApp a Ana Pérez" }));

      expect(onChanged).toHaveBeenCalledWith({ ok: false, message: "Otra persona del equipo ya gestionó esta alerta." });
      expect(onRefresh).toHaveBeenCalled();
    });

    it("is disabled when the client has no phone, and the contact can still be registered from the menu", async () => {
      vi.mocked(recordContact).mockResolvedValue({ id: "c-1" } as never);
      const noPhone = alertFixture({
        client: { id: "client-1", name: "Ana Pérez", initials: "AP", phone: null, email: "" },
      });
      renderWithSnackbar(<AlertRow alert={noPhone} {...NOTHING} />);

      const disabled = screen.getByRole("button", { name: "Ana Pérez no tiene teléfono cargado" }) as HTMLButtonElement;
      expect(disabled.disabled).toBe(true);
      expect(screen.queryByRole("link", { name: /WhatsApp/ })).toBeNull();

      await openMenu();
      await userEvent.click(screen.getByRole("button", { name: "Otro canal de contacto" }));
      await userEvent.click(screen.getByRole("button", { name: "Registrar envío" }));

      expect(recordContact).toHaveBeenCalledWith("client-1", { channel: "whatsapp", alertId: "alert-1" });
    });
  });

  describe("Gestionado", () => {
    it("marks the alert as handled once, even with a double click on the confirmation", async () => {
      let finish: (result: { ok: true }) => void = () => undefined;
      const onHandle = vi.fn().mockReturnValue(new Promise((resolve) => (finish = resolve)));
      const onChanged = vi.fn();
      renderWithSnackbar(<AlertRow alert={alertFixture()} today={TODAY} onHandle={onHandle} onChanged={onChanged} onRefresh={vi.fn()} />);

      await userEvent.click(screen.getByRole("button", { name: "Marcar gestionado" }));
      expect(screen.getByRole("group", { name: "Marcar gestionado" })).toBeDefined();
      await userEvent.dblClick(screen.getByRole("button", { name: "Sí, marcar gestionado" }));
      await act(async () => finish({ ok: true }));

      expect(onHandle).toHaveBeenCalledTimes(1);
      expect(onHandle).toHaveBeenCalledWith("alert-1");
      expect(onChanged).toHaveBeenCalledWith({ ok: true, message: "Alerta marcada como gestionada." });
    });

    it("reports the failure when the alert could not be handled", async () => {
      const onHandle = vi.fn().mockResolvedValue({ ok: false, message: "Ya la gestionó otra persona.", isStale: true });
      const onChanged = vi.fn();
      renderWithSnackbar(<AlertRow alert={alertFixture()} today={TODAY} onHandle={onHandle} onChanged={onChanged} onRefresh={vi.fn()} />);

      await userEvent.click(screen.getByRole("button", { name: "Marcar gestionado" }));
      await userEvent.click(screen.getByRole("button", { name: "Sí, marcar gestionado" }));

      expect(onChanged).toHaveBeenCalledWith({ ok: false, message: "Ya la gestionó otra persona." });
    });

    it("gives the focus back to its button when the confirmation is cancelled", async () => {
      renderWithSnackbar(<AlertRow alert={alertFixture()} {...NOTHING} />);
      const handle = screen.getByRole("button", { name: "Marcar gestionado" });

      await userEvent.click(handle);
      await userEvent.click(screen.getByRole("button", { name: "Volver" }));

      expect(document.activeElement).toBe(handle);
    });
  });

  describe("Más acciones", () => {
    it("offers the reason, another channel and the history of the client", async () => {
      renderWithSnackbar(<AlertRow alert={alertFixture()} {...NOTHING} />);
      const toggle = screen.getByRole("button", { name: "Más acciones" });
      expect(toggle.getAttribute("aria-expanded")).toBe("false");
      expect(screen.queryByRole("link", { name: "Ver historial" })).toBeNull();

      await userEvent.click(toggle);

      expect(toggle.getAttribute("aria-expanded")).toBe("true");
      expect(screen.getByRole("button", { name: "Registrar motivo" })).toBeDefined();
      expect(screen.getByRole("button", { name: "Otro canal de contacto" })).toBeDefined();
      expect(screen.getByRole("link", { name: "Ver historial" }).getAttribute("href")).toBe("/staff/clients/client-1");
    });

    it("hides the reason on a recontact alert", async () => {
      const recontact = alertFixture({
        type: "recontact",
        planName: null,
        endsOn: null,
        pause: { reason: "injury", since: "2026-09-24T12:00:00.000Z", recontactOn: "2026-11-01" },
      });
      renderWithSnackbar(<AlertRow alert={recontact} {...NOTHING} />);

      await openMenu();

      expect(screen.queryByRole("button", { name: "Registrar motivo" })).toBeNull();
      expect(screen.getByRole("button", { name: "Otro canal de contacto" })).toBeDefined();
      expect(screen.getByRole("link", { name: "Ver historial" })).toBeDefined();
    });

    it("closes with Escape and gives the focus back to the button", async () => {
      renderWithSnackbar(<AlertRow alert={alertFixture()} {...NOTHING} />);
      const toggle = screen.getByRole("button", { name: "Más acciones" });

      await userEvent.click(toggle);
      await userEvent.keyboard("{Escape}");

      expect(screen.queryByRole("link", { name: "Ver historial" })).toBeNull();
      expect(document.activeElement).toBe(toggle);
    });

    it("closes when the focus leaves the menu with the keyboard", async () => {
      renderWithSnackbar(
        <>
          <AlertRow alert={alertFixture()} {...NOTHING} />
          <button type="button">siguiente</button>
        </>,
      );
      const next = screen.getByRole("button", { name: "siguiente" });

      await openMenu();
      while (document.activeElement !== next) await userEvent.tab();

      expect(screen.queryByRole("link", { name: "Ver historial" })).toBeNull();
    });

    it("keeps the menu open while the focus moves between its own items", async () => {
      renderWithSnackbar(<AlertRow alert={alertFixture()} {...NOTHING} />);

      await openMenu();
      await userEvent.tab();
      await userEvent.tab();

      expect(screen.getByRole("link", { name: "Ver historial" })).toBeDefined();
    });

    it("only points aria-controls at the menu while it exists", async () => {
      renderWithSnackbar(<AlertRow alert={alertFixture()} {...NOTHING} />);
      const toggle = screen.getByRole("button", { name: "Más acciones" });
      expect(toggle.getAttribute("aria-controls")).toBeNull();

      await userEvent.click(toggle);

      expect(document.getElementById(toggle.getAttribute("aria-controls") ?? "")).not.toBeNull();
    });

    it("closes when clicking outside", async () => {
      renderWithSnackbar(
        <>
          <p>afuera</p>
          <AlertRow alert={alertFixture()} {...NOTHING} />
        </>,
      );

      await openMenu();
      await userEvent.click(screen.getByText("afuera"));

      expect(screen.queryByRole("link", { name: "Ver historial" })).toBeNull();
    });

    it("opens the contact form inside the row and closes it going back", async () => {
      renderWithSnackbar(<AlertRow alert={alertFixture()} {...NOTHING} />);

      await openMenu();
      await userEvent.click(screen.getByRole("button", { name: "Otro canal de contacto" }));
      expect(screen.getByRole("group", { name: "Contactar a Ana Pérez" })).toBeDefined();
      expect(screen.queryByRole("link", { name: "Ver historial" })).toBeNull();

      await userEvent.click(screen.getByRole("button", { name: "Volver" }));
      expect(screen.queryByRole("group", { name: "Contactar a Ana Pérez" })).toBeNull();
    });

    it("returns the focus to Más acciones when a form opened from it closes", async () => {
      renderWithSnackbar(<AlertRow alert={alertFixture()} {...NOTHING} />);
      const toggle = screen.getByRole("button", { name: "Más acciones" });

      await openMenu();
      await userEvent.click(screen.getByRole("button", { name: "Registrar motivo" }));
      expect(document.activeElement).toBe(screen.getByLabelText("Lesión"));
      await userEvent.click(screen.getByRole("button", { name: "Volver" }));

      expect(document.activeElement).toBe(toggle);
    });

    it("opens one form at a time", async () => {
      renderWithSnackbar(<AlertRow alert={alertFixture()} {...NOTHING} />);

      await openMenu();
      await userEvent.click(screen.getByRole("button", { name: "Otro canal de contacto" }));
      await openMenu();
      await userEvent.click(screen.getByRole("button", { name: "Registrar motivo" }));

      expect(screen.queryByRole("group", { name: "Contactar a Ana Pérez" })).toBeNull();
      expect(screen.getByRole("group", { name: "Registrar motivo de inactividad" })).toBeDefined();
    });

    it("registers a reason, reports it and refreshes", async () => {
      vi.mocked(startPause).mockResolvedValue({} as never);
      const onChanged = vi.fn();
      const onRefresh = vi.fn();
      renderWithSnackbar(<AlertRow alert={alertFixture()} today={TODAY} onHandle={vi.fn()} onChanged={onChanged} onRefresh={onRefresh} />);

      await openMenu();
      await userEvent.click(screen.getByRole("button", { name: "Registrar motivo" }));
      await userEvent.click(screen.getByLabelText("Lesión"));
      await userEvent.click(screen.getByRole("button", { name: "Guardar" }));

      expect(onChanged).toHaveBeenCalledWith({ ok: true, message: "Motivo registrado." });
      expect(onRefresh).toHaveBeenCalled();
    });

    it("reports the conflict and refreshes when the client already has a pause", async () => {
      vi.mocked(startPause).mockRejectedValue(
        new ApiError({ statusCode: 409, code: "PAUSE_ALREADY_ACTIVE", message: "El cliente ya tiene una pausa activa." }),
      );
      const onChanged = vi.fn();
      const onRefresh = vi.fn();
      renderWithSnackbar(<AlertRow alert={alertFixture()} today={TODAY} onHandle={vi.fn()} onChanged={onChanged} onRefresh={onRefresh} />);

      await openMenu();
      await userEvent.click(screen.getByRole("button", { name: "Registrar motivo" }));
      await userEvent.click(screen.getByLabelText("Lesión"));
      await userEvent.click(screen.getByRole("button", { name: "Guardar" }));

      expect(onChanged).toHaveBeenCalledWith({ ok: false, message: "El cliente ya tiene una pausa activa." });
      expect(onRefresh).toHaveBeenCalled();
    });
  });
});
