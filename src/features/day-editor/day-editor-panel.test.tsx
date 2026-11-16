import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SnackbarProvider } from "@/components/ui/snackbar";
import { addDaysToDate, todayBusinessDate } from "@/features/bookings/slots";

const push = vi.fn();
const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, replace }) }));
vi.mock("./day-editor-api", () => ({ getDayEditor: vi.fn(), previewDay: vi.fn(), applyDay: vi.fn() }));

import { DayEditorPanel } from "./day-editor-panel";
import { dayEditor, morningBand, slot } from "./day-editor.fixtures";
import { applyDay, getDayEditor, previewDay } from "./day-editor-api";

const getEditorMock = vi.mocked(getDayEditor);
const previewMock = vi.mocked(previewDay);
const applyMock = vi.mocked(applyDay);

const DAY = addDaysToDate(todayBusinessDate(), 2);
const LAST = addDaysToDate(DAY, 3);

function renderPanel(to?: string) {
  return render(<DayEditorPanel from={DAY} to={to} />, { wrapper: SnackbarProvider });
}

// Both layouts are mounted (CSS shows one), so every query says which one it is about.
const desktop = () => within(screen.getByTestId("day-editor-desktop"));
const mobile = () => within(screen.getByTestId("day-editor-mobile"));
const loaded = () => screen.findByTestId("day-editor-desktop");

function rangeEditor() {
  return dayEditor({
    from: DAY,
    to: LAST,
    isRange: true,
    services: [{ service: "recovery", bands: [{ ...morningBand(), slots: [], activeSlots: 12, bookedCount: 7 }] }],
    individualSlots: [],
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  getEditorMock.mockResolvedValue(dayEditor({ from: DAY, to: DAY }));
});

describe("DayEditorPanel", () => {
  it("shows the loading state, then what to do and the turnos of the first service", async () => {
    renderPanel();
    expect(screen.getByRole("status").textContent).toContain("Cargando");

    await loaded();
    expect(desktop().getByRole("radio", { name: /Modificar turnos/ }).getAttribute("aria-checked")).toBe("true");
    expect(desktop().getByRole("tab", { name: "Recovery" }).getAttribute("aria-selected")).toBe("true");
    expect(desktop().getByText("2 de 4 reservados")).toBeDefined();
    expect(desktop().getByText("Cupo 2 · Sin profesional · Individual")).toBeDefined();
    expect(desktop().getByText("Todavía no cambiaste nada.")).toBeDefined();
    expect((desktop().getByRole("button", { name: "Guardar cambios" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("draws the same day on the phone layout, with its own way back and title", async () => {
    renderPanel();
    await loaded();

    expect(screen.getByRole("heading", { level: 1, name: "Editar día" })).toBeDefined();
    expect(screen.getByRole("link", { name: "Asistencias" })).toHaveProperty("href", expect.stringContaining("/staff/schedule"));
    expect(mobile().getByRole("tab", { name: "Recovery" }).getAttribute("aria-selected")).toBe("true");
    expect(mobile().getByText("2 de 4 reservados")).toBeDefined();
  });

  it("switches service tabs and keeps the draft", async () => {
    const user = userEvent.setup();
    renderPanel();
    await loaded();

    await user.click(desktop().getByRole("button", { name: "Cancelar turno 09:00" }));
    expect(desktop().getByText("Se cancela")).toBeDefined();
    expect(desktop().getByText("Turno 09:00 cancelado")).toBeDefined();

    await user.click(desktop().getByRole("tab", { name: "Rehab" }));
    expect(desktop().getByRole("tab", { name: "Rehab" }).getAttribute("aria-selected")).toBe("true");
    expect(desktop().queryByText("Se cancela")).toBeNull();
    expect(desktop().getByText("Turno 09:00 cancelado")).toBeDefined();

    await user.click(desktop().getByRole("tab", { name: "Recovery" }));
    expect(desktop().getByText("Se cancela")).toBeDefined();
  });

  it("says there are no turnos for a service without franjas, and still allows an individual one", async () => {
    const user = userEvent.setup();
    renderPanel();
    await loaded();

    await user.click(desktop().getByRole("tab", { name: "Performance" }));

    expect(desktop().getByText("No hay turnos de Performance ese día.")).toBeDefined();
    expect(desktop().getByRole("button", { name: "+ Agregar turno individual" })).toBeDefined();
  });

  it("adds an individual turno to the draft", async () => {
    const user = userEvent.setup();
    renderPanel();
    await loaded();

    await user.click(desktop().getByRole("button", { name: "+ Agregar turno individual" }));
    expect(desktop().getByText("Nuevo turno individual · Recovery")).toBeDefined();
    fireEvent.change(desktop().getByLabelText("Hora de inicio"), { target: { value: "14:00" } });
    await user.click(desktop().getByRole("button", { name: "Agregar" }));

    expect(desktop().getByText("Se agrega")).toBeDefined();
    expect(desktop().getByText("Turno individual 14:00 agregado")).toBeDefined();
    expect(desktop().queryByText("Nuevo turno individual · Recovery")).toBeNull();
  });

  it("opens a turno's panel with its professional and capacity", async () => {
    const user = userEvent.setup();
    renderPanel();
    await loaded();

    await user.click(desktop().getByRole("button", { name: "Editar 09:00" }));

    expect(desktop().getByLabelText("Profesional")).toBeDefined();
    expect(desktop().getByRole("group", { name: "Cupo" })).toBeDefined();
    expect(desktop().queryByLabelText("Hasta")).toBeNull();
    expect(desktop().queryByText(/Vale para todos/)).toBeNull();

    await user.click(desktop().getByRole("button", { name: "Listo" }));
    expect(desktop().queryByRole("group", { name: "Cupo" })).toBeNull();
  });

  it("changes the capacity of that turno only, and undoes it", async () => {
    const user = userEvent.setup();
    renderPanel();
    await loaded();

    await user.click(desktop().getByRole("button", { name: "Editar 09:00" }));
    await user.click(desktop().getByRole("button", { name: "Más cupo" }));

    expect(desktop().getByText("Turno 09:00 · cupo 4 → 5")).toBeDefined();
    expect(desktop().getAllByText("Cupo 5 · Sin profesional")).toHaveLength(1);
    expect(desktop().getAllByText("Cupo 4 · Sin profesional").length).toBeGreaterThan(1);

    await user.click(desktop().getByRole("button", { name: "Deshacer cambios" }));
    expect(desktop().getByText("Todavía no cambiaste nada.")).toBeDefined();
    expect(desktop().queryByRole("button", { name: "Deshacer cambios" })).toBeNull();
  });

  it("changes the professional of that turno only", async () => {
    const user = userEvent.setup();
    renderPanel();
    await loaded();

    await user.click(desktop().getByRole("button", { name: "Editar 09:00" }));
    await user.selectOptions(desktop().getByLabelText("Profesional"), "p-ana");

    expect(desktop().getByText("Turno 09:00 · Ana Pérez")).toBeDefined();
    expect(desktop().getAllByText("Cupo 4 · Ana Pérez")).toHaveLength(1);
  });

  it("does not let the capacity of a turno go under its own bookings", async () => {
    const user = userEvent.setup();
    renderPanel();
    await loaded();

    await user.click(desktop().getByRole("button", { name: "Editar 10:00" }));
    await user.click(desktop().getByRole("button", { name: "Menos cupo" }));

    expect((desktop().getByRole("button", { name: "Menos cupo" }) as HTMLButtonElement).disabled).toBe(true);
    expect(desktop().getByText(/No puede bajar de 3, porque el turno de las 10:00 ya tiene 3 reservas/)).toBeDefined();
  });

  it("sends the turno's own edit to the backend", async () => {
    const impact = {
      cancelledSlots: 0,
      createdSlots: 0,
      modifiedSlots: 1,
      affectedBookings: { total: 0, package: 0, planOrFollowup: 0, payment: 0 },
    };
    previewMock.mockResolvedValue(impact);
    applyMock.mockResolvedValue(impact);
    const user = userEvent.setup();
    renderPanel();
    await loaded();

    await user.click(desktop().getByRole("button", { name: "Editar 09:00" }));
    await user.click(desktop().getByRole("button", { name: "Más cupo" }));
    await user.click(desktop().getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() => expect(applyMock).toHaveBeenCalled());
    expect(applyMock.mock.calls[0][0]).toMatchObject({ bands: [], slotEdits: [{ slotId: "s09", capacity: 5 }] });
  });

  it("reopens a cancelled turno", async () => {
    getEditorMock.mockResolvedValue(
      dayEditor({
        from: DAY,
        to: DAY,
        services: [
          { service: "recovery", bands: [morningBand({ slots: [slot("s09", "09:00", "09:45", 0, { state: "cancelled", cancelReason: "Feriado" })] })] },
        ],
        individualSlots: [],
      }),
    );
    const user = userEvent.setup();
    renderPanel();
    await loaded();
    expect(desktop().getByText("Cancelado · Feriado")).toBeDefined();

    await user.click(desktop().getByRole("button", { name: "Reabrir turno 09:00" }));

    expect(desktop().getByText("Se reabre")).toBeDefined();
    expect(desktop().getByText("Turno 09:00 se reabre")).toBeDefined();
  });

  it("closes the whole day from the mode cards: no turnos, the summary of closing and the reason", async () => {
    const user = userEvent.setup();
    renderPanel();
    await loaded();

    await user.click(desktop().getByRole("radio", { name: /Cerrar el día/ }));

    expect(desktop().queryByRole("tablist")).toBeNull();
    expect(desktop().getByText("Día cerrado")).toBeDefined();
    expect(desktop().getByText("10 turnos cancelados")).toBeDefined();
    expect(desktop().getByText("· 9 reservas")).toBeDefined();
    expect(desktop().getByText(/^MOVE cierra el \S+ \d{2}\/\d{2}$/)).toBeDefined();
    expect(
      desktop().getByText("Se cancelan los 10 turnos que quedan ese día en Recovery, Rehab y Performance, con 9 reservas."),
    ).toBeDefined();
    expect(desktop().getByLabelText("Motivo *")).toBeDefined();
    expect((desktop().getByRole("button", { name: "Cerrar día" }) as HTMLButtonElement).disabled).toBe(false);

    await user.click(desktop().getByRole("radio", { name: /Modificar turnos/ }));
    expect(desktop().getByRole("tablist")).toBeDefined();
    expect(desktop().getByText("Todavía no cambiaste nada.")).toBeDefined();
  });

  it("picks the last day to close from 'Varios días' and reloads the editor for that range", async () => {
    const user = userEvent.setup();
    renderPanel();
    await loaded();
    await user.click(desktop().getByRole("radio", { name: /Cerrar el día/ }));

    await user.click(desktop().getByRole("radio", { name: "Varios días" }));

    expect((desktop().getByLabelText("Desde") as HTMLInputElement).value).toBe(DAY);
    expect((desktop().getByLabelText("Desde") as HTMLInputElement).disabled).toBe(true);
    expect(desktop().getByText("Elegí hasta qué día")).toBeDefined();
    expect(desktop().getByText("Elegí hasta qué día para ver el resumen.")).toBeDefined();
    expect((desktop().getByRole("button", { name: "Cerrar día" }) as HTMLButtonElement).disabled).toBe(true);

    fireEvent.change(desktop().getByLabelText("Hasta"), { target: { value: LAST } });
    expect(replace).toHaveBeenCalledWith(`/staff/schedule/edit?date=${DAY}&to=${LAST}`);
  });

  it("opens a range already closing it, and goes back to one day or to editing", async () => {
    getEditorMock.mockResolvedValue(rangeEditor());
    const user = userEvent.setup();
    renderPanel(LAST);
    await loaded();

    expect(desktop().getByRole("radio", { name: /Cerrar el día/ }).getAttribute("aria-checked")).toBe("true");
    expect(desktop().getByRole("radio", { name: "Varios días" }).getAttribute("aria-checked")).toBe("true");
    expect((desktop().getByLabelText("Hasta") as HTMLInputElement).value).toBe(LAST);
    expect(desktop().getByText("12 turnos cancelados")).toBeDefined();
    expect(desktop().getByText("· 7 reservas")).toBeDefined();
    expect(desktop().getByText(/^Del \d{2}\/\d{2} al \d{2}\/\d{2}$/)).toBeDefined();

    await user.click(desktop().getByRole("radio", { name: "Solo este día" }));
    expect(replace).toHaveBeenLastCalledWith(`/staff/schedule/edit?date=${DAY}`);

    await user.click(desktop().getByRole("radio", { name: /Modificar turnos/ }));
    expect(replace).toHaveBeenCalledTimes(2);
    expect(desktop().getByRole("tablist")).toBeDefined();
  });

  it("asks for the reason before saving a cancellation and calls nothing", async () => {
    const user = userEvent.setup();
    renderPanel();
    await loaded();

    await user.click(desktop().getByRole("button", { name: "Cancelar turno 09:00" }));
    await user.click(desktop().getByRole("button", { name: "Guardar cambios" }));

    expect(desktop().getByRole("alert").textContent).toContain("motivo");
    expect(previewMock).not.toHaveBeenCalled();
  });

  it("opens the confirmation with the grouped impact the backend previewed", async () => {
    previewMock.mockResolvedValue({
      cancelledSlots: 1,
      createdSlots: 0,
      modifiedSlots: 0,
      affectedBookings: { total: 2, package: 1, planOrFollowup: 0, payment: 1 },
    });
    const user = userEvent.setup();
    renderPanel();
    await loaded();

    await user.click(desktop().getByRole("button", { name: "Cancelar turno 09:00" }));
    await user.type(desktop().getByLabelText("Motivo *"), "Feriado");
    await user.click(desktop().getByRole("button", { name: "Guardar cambios" }));

    expect(await screen.findByRole("dialog", { name: "¿Cancelar 1 turno con 2 reservas?" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Cancelar 2 reservas y guardar" })).toBeDefined();
    await user.click(screen.getByRole("button", { name: "Volver" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    // The draft survived going back.
    expect(desktop().getByText("Se cancela")).toBeDefined();
  });

  it("discards the draft", async () => {
    const user = userEvent.setup();
    renderPanel();
    await loaded();
    await user.click(desktop().getByRole("button", { name: "Cancelar turno 09:00" }));

    await user.click(desktop().getByRole("button", { name: "Descartar" }));

    expect(desktop().queryByText("Se cancela")).toBeNull();
    expect(desktop().getByText("Todavía no cambiaste nada.")).toBeDefined();
  });

  it("shows an error with a retry when the day cannot be loaded", async () => {
    getEditorMock.mockRejectedValueOnce(new Error("boom"));
    const user = userEvent.setup();
    renderPanel();

    expect(await screen.findByText("No pudimos cargar el día")).toBeDefined();
    await user.click(screen.getByRole("button", { name: "Reintentar" }));

    expect(await loaded()).toBeDefined();
  });

  describe("on the phone", () => {
    it("reviews the changes in a sheet that closes with its button and with Escape", async () => {
      const user = userEvent.setup();
      renderPanel();
      await loaded();
      await user.click(mobile().getByRole("button", { name: "Cancelar turno 09:00" }));

      await user.click(mobile().getByRole("button", { name: "Revisar" }));
      const sheet = mobile().getByRole("dialog", { name: "Resumen de cambios" });
      expect(within(sheet).getByText("Recovery")).toBeDefined();
      expect(within(sheet).getByText("Turno 09:00 cancelado")).toBeDefined();

      await user.click(within(sheet).getByRole("button", { name: "Cerrar" }));
      expect(mobile().queryByRole("dialog")).toBeNull();

      await user.click(mobile().getByRole("button", { name: "Revisar" }));
      await user.keyboard("{Escape}");
      expect(mobile().queryByRole("dialog")).toBeNull();
    });

    it("opens the sheet to ask for the missing reason when saving from the bar", async () => {
      const user = userEvent.setup();
      renderPanel();
      await loaded();
      expect((mobile().getByRole("button", { name: "Guardar cambios" }) as HTMLButtonElement).disabled).toBe(true);
      await user.click(mobile().getByRole("button", { name: "Cancelar turno 09:00" }));

      await user.click(mobile().getByRole("button", { name: "Guardar cambios" }));

      const sheet = mobile().getByRole("dialog", { name: "Resumen de cambios" });
      expect(within(sheet).getByRole("alert").textContent).toContain("motivo");
      expect(previewMock).not.toHaveBeenCalled();
    });

    it("discards from the sheet and closes it", async () => {
      const user = userEvent.setup();
      renderPanel();
      await loaded();
      await user.click(mobile().getByRole("button", { name: "Cancelar turno 09:00" }));
      await user.click(mobile().getByRole("button", { name: "Revisar" }));

      await user.click(within(mobile().getByRole("dialog")).getByRole("button", { name: "Descartar" }));

      expect(mobile().queryByRole("dialog")).toBeNull();
      expect(mobile().queryByText("Se cancela")).toBeNull();
    });

    it("edits a turno under its own row", async () => {
      const user = userEvent.setup();
      renderPanel();
      await loaded();

      await user.click(mobile().getByRole("button", { name: "Editar 09:00" }));
      await user.selectOptions(mobile().getByLabelText("Profesional"), "p-ana");
      await user.click(mobile().getByRole("button", { name: "Revisar" }));

      expect(within(mobile().getByRole("dialog")).getByText("Turno 09:00 · Ana Pérez")).toBeDefined();
    });
  });
});
