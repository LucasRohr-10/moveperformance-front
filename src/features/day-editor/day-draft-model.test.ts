import { describe, expect, it } from "vitest";

import {
  DAY,
  afternoonBand,
  dayEditor,
  individualSlot,
  morningBand,
  rehabBand,
  slot,
} from "./day-editor.fixtures";
import {
  draftReducer,
  initialDraft,
  localSummary,
  slotDraftState,
  slotValues,
  toDraftDto,
  type DayDraftState,
  type DraftAction,
} from "./day-draft-model";

function run(state: DayDraftState, ...actions: DraftAction[]): DayDraftState {
  return actions.reduce(draftReducer, state);
}

describe("draft model", () => {
  it("toggleSlotCancel twice returns to the original state and isDirty false", () => {
    const editor = dayEditor();
    const initial = initialDraft(editor);

    const marked = run(initial, { type: "toggleSlotCancel", slotId: "s09" });
    expect(localSummary(marked, editor).isDirty).toBe(true);

    const back = run(marked, { type: "toggleSlotCancel", slotId: "s09" });
    expect(back).toEqual(initial);
    expect(localSummary(back, editor).isDirty).toBe(false);
  });

  it("toggleCloseDay marks every non-started slot as cancelled and needsReason true", () => {
    const editor = dayEditor({
      services: [
        {
          service: "recovery",
          bands: [
            morningBand({
              slots: [
                slot("s08", "08:00", "08:45", 2, { state: "started" }),
                slot("s09", "09:00", "09:45", 0),
                slot("s10", "10:00", "10:45", 3),
              ],
            }),
          ],
        },
        { service: "rehab", bands: [rehabBand()] },
      ],
      individualSlots: [],
    });

    const closed = run(initialDraft(editor), { type: "toggleCloseDay" });
    const summary = localSummary(closed, editor);

    expect(summary.cancelledSlots.count).toBe(5);
    expect(summary.bookingsInCancelledSlots).toBe(0 + 3 + 1 + 0 + 1);
    expect(summary.needsReason).toBe(true);
    const started = editor.services[0].bands[0].slots[0];
    expect(slotDraftState(closed, started)).toBe("started");
    expect(slotDraftState(closed, editor.services[0].bands[0].slots[1])).toBe("marked");
  });

  it("cancelling every slot of a band one by one keeps the band open and counts each slot once", () => {
    const editor = dayEditor();

    const state = run(
      initialDraft(editor),
      { type: "toggleSlotCancel", slotId: "s08" },
      { type: "toggleSlotCancel", slotId: "s09" },
      { type: "toggleSlotCancel", slotId: "s10" },
    );

    expect(state.bands["t-morning"].isOpen).toBe(true);
    expect(localSummary(state, editor).cancelledSlots.count).toBe(3);
    expect(toDraftDto(state).bands).toEqual([]);

    // Closing the band on top of that must not count the same slots twice.
    const closedToo = run(state, { type: "toggleBand", templateId: "t-morning" });
    expect(localSummary(closedToo, editor).cancelledSlots.count).toBe(3);
  });

  it("a slot's own capacity and professional are edits of that slot only", () => {
    const editor = dayEditor();
    const state = run(
      initialDraft(editor),
      { type: "setSlotCapacity", slotId: "s09", capacity: 6 },
      { type: "setSlotProfessional", slotId: "s09", professionalId: "p-ana" },
    );

    expect(state.slotEdits).toEqual({ s09: { capacity: 6, professionalId: "p-ana" } });
    expect(slotValues(state, editor.services[0].bands[0].slots[1])).toEqual({ professionalId: "p-ana", capacity: 6 });
    expect(slotValues(state, editor.services[0].bands[0].slots[0])).toEqual({ professionalId: null, capacity: 4 });
    expect(localSummary(state, editor).isDirty).toBe(true);
    expect(toDraftDto(state)).toMatchObject({ bands: [], slotEdits: [{ slotId: "s09", capacity: 6, professionalId: "p-ana" }] });
  });

  it("an edit set back to the saved value leaves nothing behind", () => {
    const editor = dayEditor();

    const state = run(
      initialDraft(editor),
      { type: "setSlotCapacity", slotId: "s09", capacity: 6 },
      { type: "setSlotProfessional", slotId: "s09", professionalId: "p-ana" },
      { type: "setSlotCapacity", slotId: "s09", capacity: 4 },
    );
    expect(state.slotEdits).toEqual({ s09: { professionalId: "p-ana" } });

    const back = run(state, { type: "setSlotProfessional", slotId: "s09", professionalId: null });
    expect(back.slotEdits).toEqual({});
    expect(localSummary(back, editor).isDirty).toBe(false);
    expect(toDraftDto(back).slotEdits).toEqual([]);
  });

  it("resetSlot puts one slot back and leaves the others alone", () => {
    const editor = dayEditor();
    const edited = run(
      initialDraft(editor),
      { type: "setSlotCapacity", slotId: "s08", capacity: 6 },
      { type: "setSlotCapacity", slotId: "s09", capacity: 2 },
    );

    expect(run(edited, { type: "resetSlot", slotId: "s08" }).slotEdits).toEqual({ s09: { capacity: 2 } });
  });

  it("only a slot that is active can be edited", () => {
    const editor = dayEditor({
      services: [
        { service: "recovery", bands: [morningBand({ slots: [slot("s08", "08:00", "08:45", 0, { state: "started" })] })] },
      ],
    });

    expect(run(initialDraft(editor), { type: "setSlotCapacity", slotId: "s08", capacity: 6 }).slotEdits).toEqual({});
    expect(run(initialDraft(editor), { type: "setSlotCapacity", slotId: "nope", capacity: 6 }).slotEdits).toEqual({});
  });

  it("toDraftDto leaves out the edits of a slot that goes away with the draft", () => {
    const editor = dayEditor();
    const edited = run(
      initialDraft(editor),
      { type: "setSlotCapacity", slotId: "s08", capacity: 6 },
      { type: "setSlotCapacity", slotId: "s09", capacity: 6 },
      { type: "setSlotCapacity", slotId: "s10", capacity: 6 },
      { type: "toggleSlotCancel", slotId: "s09" },
      { type: "toggleBand", templateId: "t-morning" },
    );
    expect(toDraftDto(edited).slotEdits).toEqual([]);

    const keptBand = run(
      initialDraft(editor),
      { type: "setSlotCapacity", slotId: "s08", capacity: 6 },
      { type: "setSlotCapacity", slotId: "s09", capacity: 6 },
      { type: "toggleSlotCancel", slotId: "s09" },
    );
    expect(toDraftDto(keptBand).slotEdits).toEqual([{ slotId: "s08", capacity: 6 }]);

    const closed = run(edited, { type: "toggleBand", templateId: "t-morning" }, { type: "toggleCloseDay" });
    expect(toDraftDto(closed).slotEdits).toEqual([]);
  });

  it("toDraftDto sends only changed bands and never includes started slots", () => {
    const editor = dayEditor({
      services: [
        {
          service: "recovery",
          bands: [
            morningBand({
              slots: [
                slot("s08", "08:00", "08:45", 2, { state: "started" }),
                slot("s09", "09:00", "09:45", 0),
                slot("s10", "10:00", "10:45", 3),
              ],
            }),
            afternoonBand(),
          ],
        },
      ],
    });

    const state = run(
      initialDraft(editor),
      { type: "setBandProfessional", templateId: "t-afternoon", professionalId: "p-ana" },
      { type: "toggleSlotCancel", slotId: "s08" },
      { type: "toggleSlotCancel", slotId: "s10" },
      { type: "setReason", reason: "  Mantenimiento  " },
    );

    expect(toDraftDto(state)).toEqual({
      from: DAY,
      reason: "Mantenimiento",
      bands: [{ templateId: "t-afternoon", isOpen: true, professionalId: "p-ana" }],
      slotEdits: [],
      cancelSlotIds: ["s10"],
      reopenSlotIds: [],
      addSlots: [],
      removeSlotIds: [],
    });
  });

  it("toDraftDto sends only closeWholeDay and the reason when the whole day is closed", () => {
    const editor = dayEditor();

    const state = run(
      initialDraft(editor),
      { type: "toggleSlotCancel", slotId: "s09" },
      { type: "toggleCloseDay" },
      { type: "setReason", reason: "Feriado" },
    );

    expect(toDraftDto(state)).toEqual({
      from: DAY,
      reason: "Feriado",
      closeWholeDay: true,
      bands: [],
      slotEdits: [],
      cancelSlotIds: [],
      reopenSlotIds: [],
      addSlots: [],
      removeSlotIds: [],
    });
  });

  it("sends a closed band and the changed hours, and cancels the slots that stop fitting", () => {
    const editor = dayEditor();

    const state = run(
      initialDraft(editor),
      { type: "setBandHours", templateId: "t-morning", startTime: "08:00", endTime: "10:00" },
    );

    expect(toDraftDto(state).bands).toEqual([
      { templateId: "t-morning", isOpen: true, startTime: "08:00", endTime: "10:00" },
    ]);
    const summary = localSummary(state, editor);
    expect(summary.cancelledSlots.count).toBe(1);
    expect(summary.bookingsInCancelledSlots).toBe(3);
    expect(slotDraftState(state, editor.services[0].bands[0].slots[2])).toBe("dropped");
  });

  it("reopens a staff-cancelled slot and lets the staff undo it", () => {
    const cancelled = slot("s09", "09:00", "09:45", 0, { state: "cancelled", cancelReason: "Mantenimiento" });
    const editor = dayEditor({
      services: [{ service: "recovery", bands: [morningBand({ slots: [cancelled] })] }],
      individualSlots: [],
    });
    const initial = initialDraft(editor);
    expect(slotDraftState(initial, cancelled)).toBe("cancelled");

    const reopened = run(initial, { type: "reopenSlot", slotId: "s09" });
    expect(slotDraftState(reopened, cancelled)).toBe("reopening");
    expect(toDraftDto(reopened).reopenSlotIds).toEqual(["s09"]);
    expect(localSummary(reopened, editor).isDirty).toBe(true);

    expect(run(reopened, { type: "toggleSlotCancel", slotId: "s09" })).toEqual(initial);
  });

  it("does not let a started slot be marked", () => {
    const started = slot("s08", "08:00", "08:45", 2, { state: "started" });
    const editor = dayEditor({
      services: [{ service: "recovery", bands: [morningBand({ slots: [started] })] }],
    });

    const state = run(initialDraft(editor), { type: "toggleSlotCancel", slotId: "s08" });

    expect(state).toEqual(initialDraft(editor));
  });

  it("localSummary.detail lists single slots and closed bands like the mockup", () => {
    const editor = dayEditor();

    const state = run(
      initialDraft(editor),
      { type: "toggleSlotCancel", slotId: "s09" },
      { type: "toggleBand", templateId: "t-afternoon" },
      { type: "setBandProfessional", templateId: "t-rehab", professionalId: "p-ana" },
      {
        type: "addSlot",
        slot: { service: "recovery", startTime: "12:30", durationMinutes: 60, capacity: 2, professionalId: null },
      },
    );
    const summary = localSummary(state, editor);

    expect(summary.cancelledSlots).toEqual({
      count: 4,
      detail: "Recovery 09:00 · franja de la tarde (3)",
    });
    expect(summary.professionalChanges).toEqual({ count: 1, detail: "Rehab: Ana Pérez cubre a Juan Gómez" });
    expect(summary.addedSlots).toEqual({ count: 1, detail: "Recovery 12:30" });
    expect(summary.bookingsInCancelledSlots).toBe(0 + 0 + 1 + 1);
  });

  it("counts a removed individual slot as a cancellation and a removed new one as nothing", () => {
    const editor = dayEditor({ individualSlots: [individualSlot()] });

    const withNew = run(initialDraft(editor), {
      type: "addSlot",
      slot: { service: "recovery", startTime: "14:00", durationMinutes: 60, capacity: 2, professionalId: null },
    });
    expect(withNew.addedSlots).toHaveLength(1);

    const removedNew = run(withNew, { type: "removeSlot", key: withNew.addedSlots[0].key });
    expect(removedNew).toEqual(initialDraft(editor));

    const removedExisting = run(initialDraft(editor), { type: "removeSlot", key: "i1" });
    expect(localSummary(removedExisting, editor)).toMatchObject({
      cancelledSlots: { count: 1, detail: "Recovery 12:30" },
      needsReason: true,
    });
    expect(toDraftDto(removedExisting).removeSlotIds).toEqual(["i1"]);
  });

  it("counts a closed band of a range from its active slots", () => {
    const editor = dayEditor({
      to: "2026-11-15",
      isRange: true,
      services: [
        {
          service: "recovery",
          bands: [morningBand({ slots: [], activeSlots: 12, bookedCount: 7 })],
        },
      ],
      individualSlots: [],
    });

    const state = run(initialDraft(editor), { type: "toggleBand", templateId: "t-morning" });

    expect(localSummary(state, editor)).toMatchObject({
      cancelledSlots: { count: 12 },
      bookingsInCancelledSlots: 7,
    });
    expect(toDraftDto(state)).toMatchObject({ from: DAY, to: "2026-11-15" });
  });

  it("reset goes back to the initial draft", () => {
    const editor = dayEditor();
    const state = run(
      initialDraft(editor),
      { type: "toggleSlotCancel", slotId: "s09" },
      { type: "setReason", reason: "x" },
      { type: "reset" },
    );

    expect(state).toEqual(initialDraft(editor));
  });

  it("names a band by the time of the day in the detail, with its service when it opens the list", () => {
    const editor = dayEditor();
    const state = run(initialDraft(editor), { type: "toggleBand", templateId: "t-morning" });

    expect(localSummary(state, editor).cancelledSlots.detail).toBe("Recovery franja de la mañana (3)");
  });
});
