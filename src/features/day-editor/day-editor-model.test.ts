import { describe, expect, it } from "vitest";

import { draftReducer, initialDraft, type DayDraftState, type DraftAction } from "./day-draft-model";
import { buildChangeGroups, buildTurnoRows, closeDayChanges, isStruck } from "./day-editor-model";
import { dayEditor, morningBand, slot } from "./day-editor.fixtures";

function draftOf(editor = dayEditor(), ...actions: DraftAction[]): DayDraftState {
  return actions.reduce(draftReducer, initialDraft(editor));
}

const rowAt = (state: DayDraftState, time: string, service: "recovery" | "rehab" | "performance" = "recovery") => {
  const row = buildTurnoRows(state, service).find((candidate) => candidate.time === time);
  if (!row) throw new Error(`no row at ${time}`);
  return row;
};

describe("buildTurnoRows", () => {
  it("lists the franjas' turnos and the individual ones of a service together, by time", () => {
    const rows = buildTurnoRows(draftOf(), "recovery");

    expect(rows.map((row) => row.time)).toEqual(["08:00", "09:00", "10:00", "12:30", "16:00", "17:00", "18:00"]);
    expect(rows[0]).toMatchObject({ statusText: "2 de 4 reservados", statusTone: "strong", detail: "Cupo 4 · Sin profesional" });
    expect(rows[1]).toMatchObject({ statusText: "Sin reservas", statusTone: "normal" });
    expect(rows[3]).toMatchObject({ detail: "Cupo 2 · Sin profesional · Individual", bandId: null });
  });

  it("says there is nothing for a service without franjas or individual turnos", () => {
    expect(buildTurnoRows(draftOf(), "performance")).toEqual([]);
  });

  it("offers Editar and Cancelar turno on an active franja turno, and only Quitar turno on an individual one", () => {
    const state = draftOf();

    expect(rowAt(state, "09:00")).toMatchObject({ canEdit: true, action: { label: "Cancelar turno", isDanger: true } });
    expect(rowAt(state, "12:30")).toMatchObject({ canEdit: false, action: { label: "Quitar turno", isDanger: true } });
  });

  it("marks a turno staff cancels, and takes the mark off again", () => {
    const state = draftOf(dayEditor(), { type: "toggleSlotCancel", slotId: "s09" });
    const row = rowAt(state, "09:00");

    expect(row).toMatchObject({ state: "marked", statusText: "Se cancela", statusTone: "danger", canEdit: false });
    expect(row.action).toMatchObject({ label: "No cancelar", isDanger: false });
    expect(isStruck(row)).toBe(true);

    const undone = draftOf(dayEditor(), { type: "toggleSlotCancel", slotId: "s09" }, { type: "toggleSlotCancel", slotId: "s09" });
    expect(rowAt(undone, "09:00").state).toBe("active");
  });

  it("gives no action to a turno that already started", () => {
    const editor = dayEditor({
      services: [{ service: "recovery", bands: [morningBand({ slots: [slot("s08", "08:00", "08:45", 2, { state: "started" })] })] }],
      individualSlots: [],
    });
    const row = rowAt(draftOf(editor), "08:00");

    expect(row).toMatchObject({ statusText: "Ya empezó", canEdit: false, action: null });
  });

  it("shows why a cancelled turno was cancelled, and lets it be reopened and that undone", () => {
    const editor = dayEditor({
      services: [
        { service: "recovery", bands: [morningBand({ slots: [slot("s09", "09:00", "09:45", 0, { state: "cancelled", cancelReason: "Feriado" })] })] },
      ],
      individualSlots: [],
    });

    const cancelled = rowAt(draftOf(editor), "09:00");
    expect(cancelled).toMatchObject({ statusText: "Cancelado · Feriado", statusTone: "danger" });
    expect(cancelled.action).toMatchObject({ label: "Reabrir turno", draftAction: { type: "reopenSlot", slotId: "s09" } });

    const reopening = rowAt(draftOf(editor, { type: "reopenSlot", slotId: "s09" }), "09:00");
    expect(reopening).toMatchObject({ statusText: "Se reabre" });
    expect(reopening.action).toMatchObject({ label: "No reabrir", draftAction: { type: "toggleSlotCancel", slotId: "s09" } });
  });

  it("carries a turno's own edits on that row only", () => {
    const state = draftOf(dayEditor(), { type: "setSlotCapacity", slotId: "s08", capacity: 6 });

    expect(rowAt(state, "08:00")).toMatchObject({ isEdited: true, detail: "Cupo 6 · Sin profesional", statusText: "2 de 6 reservados" });
    expect(rowAt(state, "09:00")).toMatchObject({ isEdited: false, detail: "Cupo 4 · Sin profesional" });
    expect(rowAt(state, "16:00").isEdited).toBe(false);
  });

  it("names each turno's own professional, the edited one and the saved one", () => {
    const state = draftOf(dayEditor(), { type: "setSlotProfessional", slotId: "s09", professionalId: "p-ana" });

    expect(rowAt(state, "09:00").detail).toBe("Cupo 4 · Ana Pérez");
    expect(rowAt(state, "08:00").detail).toBe("Cupo 4 · Sin profesional");
    expect(rowAt(draftOf(), "09:00", "rehab").detail).toBe("Cupo 1 · Juan Gómez");
  });

  it("shows what a turno was saved with once it is going to be cancelled, not its edits", () => {
    const state = draftOf(
      dayEditor(),
      { type: "setSlotCapacity", slotId: "s09", capacity: 6 },
      { type: "toggleSlotCancel", slotId: "s09" },
    );

    expect(rowAt(state, "09:00")).toMatchObject({ state: "marked", isEdited: false, detail: "Cupo 4 · Sin profesional" });
  });

  it("shows the turnos new hours would create, and the ones they would drop", () => {
    const longer = draftOf(dayEditor(), { type: "setBandHours", templateId: "t-morning", startTime: "08:00", endTime: "11:45" });
    expect(rowAt(longer, "11:00")).toMatchObject({ state: "new", statusText: "Se crea", action: null, canEdit: false });

    const shorter = draftOf(dayEditor(), { type: "setBandHours", templateId: "t-morning", startTime: "09:00", endTime: "10:45" });
    expect(rowAt(shorter, "08:00")).toMatchObject({
      state: "dropped",
      statusText: "Se cancela · ya no entra en el horario",
      action: null,
    });
  });

  it("lists a franja closed that day with no turnos as one row that opens it", () => {
    const closed = morningBand({ isOpen: false, slots: [], activeSlots: 0, bookedCount: 0 });
    const editor = dayEditor({ services: [{ service: "recovery", bands: [closed] }], individualSlots: [] });

    const row = rowAt(draftOf(editor), "08:00");
    expect(row).toMatchObject({ statusText: "Franja cerrada", canEdit: false });
    expect(row.action).toMatchObject({ label: "Abrir franja", draftAction: { type: "toggleBand", templateId: "t-morning" } });

    const opening = rowAt(draftOf(editor, { type: "toggleBand", templateId: "t-morning" }), "08:00");
    expect(opening).toMatchObject({ statusText: "Se abre la franja" });
    expect(opening.action).toMatchObject({ label: "No abrir" });
  });

  it("removes an individual turno and adds a new one", () => {
    const removed = draftOf(dayEditor(), { type: "removeSlot", key: "i1" });
    expect(rowAt(removed, "12:30")).toMatchObject({ statusText: "Se cancela", action: { label: "No quitar", isDanger: false } });

    const added = draftOf(dayEditor(), {
      type: "addSlot",
      slot: { service: "recovery", startTime: "14:00", durationMinutes: 60, capacity: 3, professionalId: "p-ana" },
    });
    expect(rowAt(added, "14:00")).toMatchObject({
      statusText: "Se agrega",
      detail: "Cupo 3 · Ana Pérez · Individual",
      action: { label: "Quitar", draftAction: { type: "removeSlot", key: "new-1" } },
    });
  });
});

describe("buildChangeGroups", () => {
  it("is empty when nothing changed", () => {
    expect(buildChangeGroups(draftOf())).toEqual([]);
  });

  it("groups what changed by service, with the bookings a cancellation takes along", () => {
    const state = draftOf(
      dayEditor(),
      { type: "toggleSlotCancel", slotId: "s08" },
      { type: "setSlotCapacity", slotId: "s09", capacity: 5 },
      { type: "setSlotProfessional", slotId: "s09", professionalId: "p-ana" },
      { type: "toggleSlotCancel", slotId: "r10" },
    );

    expect(buildChangeGroups(state)).toEqual([
      {
        scope: "Recovery",
        items: [
          { kind: "cancel", text: "Turno 08:00 cancelado", note: "2 reservas" },
          { kind: "edit", text: "Turno 09:00 · cupo 4 → 5" },
          { kind: "edit", text: "Turno 09:00 · Ana Pérez" },
        ],
      },
      { scope: "Rehab", items: [{ kind: "cancel", text: "Turno 10:00 cancelado", note: undefined }] },
    ]);
  });

  it("says who a different professional covers for", () => {
    const state = draftOf(dayEditor(), { type: "setSlotProfessional", slotId: "r10", professionalId: "p-ana" });

    expect(buildChangeGroups(state)).toEqual([
      { scope: "Rehab", items: [{ kind: "edit", text: "Turno 10:00 · Ana Pérez (cubre a Juan Gómez)" }] },
    ]);
  });

  it("lists the new turnos, the ones reopened and the individual ones added or removed", () => {
    const editor = dayEditor({
      services: [
        {
          service: "recovery",
          bands: [morningBand({ slots: [slot("s09", "09:00", "09:45", 0, { state: "cancelled" })] })],
        },
      ],
    });
    const state = draftOf(
      editor,
      { type: "reopenSlot", slotId: "s09" },
      { type: "setBandHours", templateId: "t-morning", startTime: "08:00", endTime: "11:45" },
      { type: "removeSlot", key: "i1" },
      { type: "addSlot", slot: { service: "recovery", startTime: "14:00", durationMinutes: 60, capacity: 2, professionalId: null } },
    );

    const items = buildChangeGroups(state)[0].items.map((item) => item.text);
    expect(items).toEqual([
      "Turno 09:00 se reabre",
      "Turno 08:00 nuevo",
      "Turno 10:00 nuevo",
      "Turno 11:00 nuevo",
      "Franja 08:00 – 10:45 · horario 08:00 – 11:45",
      "Turno individual 12:30 se quita",
      "Turno individual 14:00 agregado",
    ]);
  });
});

describe("closeDayChanges", () => {
  it("says the day is closed and how many turnos and bookings go with it", () => {
    expect(closeDayChanges("Jueves 12/11", 7, 3)).toEqual([
      {
        scope: "Jueves 12/11",
        items: [
          { kind: "close", text: "Día cerrado" },
          { kind: "cancel", text: "7 turnos cancelados", note: "3 reservas" },
        ],
      },
    ]);
  });

  it("uses the singular, and leaves the bookings out when there are none", () => {
    expect(closeDayChanges("Del 12/11 al 15/11", 1, 0)[0].items[1]).toEqual({
      kind: "cancel",
      text: "1 turno cancelado",
      note: undefined,
    });
  });
});
