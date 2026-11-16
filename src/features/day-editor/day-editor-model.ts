import { formatSlotTime } from "@/features/bookings/slots";
import type { DayBandDto, DayEditorDto, DayEditorSlotDto, ServiceType } from "@/lib/api/types";

import { SERVICE_LABELS } from "./band-labels";
import {
  createdStarts,
  slotDraftState,
  slotValues,
  type BandDraft,
  type DayDraftState,
  type DraftAction,
  type SlotDraftState,
} from "./day-draft-model";
import { pluralize } from "./plural";

// What the editor shows, derived from the draft alone: the turno rows of a service and the summary of changes.

// The order the tabs have in the design.
export const SERVICE_ORDER: ServiceType[] = ["recovery", "rehab", "performance"];

export type TurnoState = SlotDraftState | "new";
export type StatusTone = "danger" | "strong" | "normal";

export interface TurnoAction {
  label: string;
  /** Red text: the action takes something away. */
  isDanger: boolean;
  draftAction: DraftAction;
}

export interface TurnoRow {
  key: string;
  /** HH:mm, Montevideo. */
  time: string;
  state: TurnoState;
  statusText: string;
  statusTone: StatusTone;
  /** "Cupo 4 · Ana Pérez". */
  detail: string;
  /** Template id of the franja the turno belongs to; null for an individual turno. */
  bandId: string | null;
  /** The franja's hours, professional or capacity differ from what is saved. */
  isEdited: boolean;
  /** Franja values can be edited from this row. */
  canEdit: boolean;
  action: TurnoAction | null;
}

/** Cancelled, or marked to be: the row is struck through. */
export function isStruck(row: TurnoRow): boolean {
  return row.state === "marked" || row.state === "dropped" || row.state === "cancelled";
}

function statusOf(
  state: TurnoState,
  booked: number,
  capacity: number,
  cancelReason: string | null,
  isIndividual: boolean,
): { text: string; tone: StatusTone } {
  switch (state) {
    case "started":
      return { text: "Ya empezó", tone: "normal" };
    case "marked":
      return { text: "Se cancela", tone: "danger" };
    case "dropped":
      return { text: "Se cancela · ya no entra en el horario", tone: "danger" };
    case "cancelled":
      return { text: cancelReason ? `Cancelado · ${cancelReason}` : "Cancelado", tone: "danger" };
    case "reopening":
      return { text: "Se reabre", tone: "strong" };
    case "new":
      return { text: isIndividual ? "Se agrega" : "Se crea", tone: "strong" };
    case "active":
      return booked > 0
        ? { text: `${booked} de ${capacity} reservados`, tone: "strong" }
        : { text: "Sin reservas", tone: "normal" };
  }
}

function detailOf(capacity: number, professionalName: string | null, isIndividual: boolean): string {
  const base = `Cupo ${capacity} · ${professionalName ?? "Sin profesional"}`;
  return isIndividual ? `${base} · Individual` : base;
}

function professionalNameOf(editor: DayEditorDto, professionalId: string | null, fallback: string | null): string | null {
  return editor.professionals.find((professional) => professional.id === professionalId)?.name ?? fallback;
}

function bandSlotAction(
  state: DayDraftState,
  band: DayBandDto,
  slot: DayEditorSlotDto,
  slotState: SlotDraftState,
): TurnoAction | null {
  const toggleCancel: DraftAction = { type: "toggleSlotCancel", slotId: slot.id };
  switch (slotState) {
    case "active":
      return { label: "Cancelar turno", isDanger: true, draftAction: toggleCancel };
    case "marked":
      return state.cancelSlotIds.includes(slot.id) ? { label: "No cancelar", isDanger: false, draftAction: toggleCancel } : null;
    case "cancelled":
      return { label: "Reabrir turno", isDanger: false, draftAction: { type: "reopenSlot", slotId: slot.id } };
    case "reopening":
      return { label: "No reabrir", isDanger: false, draftAction: toggleCancel };
    default:
      return null;
  }
}

function individualAction(slot: DayEditorSlotDto, slotState: SlotDraftState): TurnoAction | null {
  switch (slotState) {
    case "active":
      return { label: "Quitar turno", isDanger: true, draftAction: { type: "removeSlot", key: slot.id } };
    case "marked":
      return { label: "No quitar", isDanger: false, draftAction: { type: "removeSlot", key: slot.id } };
    case "cancelled":
      return { label: "Reabrir turno", isDanger: false, draftAction: { type: "reopenSlot", slotId: slot.id } };
    case "reopening":
      return { label: "No reabrir", isDanger: false, draftAction: { type: "toggleSlotCancel", slotId: slot.id } };
    default:
      return null;
  }
}

function bandProfessionalName(editor: DayEditorDto, band: DayBandDto, draft: BandDraft): string | null {
  const saved = draft.professionalId === band.effective.professionalId ? band.effective.professionalName : null;
  return professionalNameOf(editor, draft.professionalId, saved);
}

function bandRows(state: DayDraftState, band: DayBandDto): TurnoRow[] {
  const { editor } = state;
  const draft = state.bands[band.templateId];
  const professionalName = bandProfessionalName(editor, band, draft);

  // A band closed that day with no slot left to list: it is still a way to open it again.
  if (band.slots.length === 0) {
    if (band.isOpen) return [];
    return [
      {
        key: `band-${band.templateId}`,
        time: band.template.startTime,
        state: draft.isOpen ? "new" : "cancelled",
        statusText: draft.isOpen ? "Se abre la franja" : "Franja cerrada",
        statusTone: draft.isOpen ? "strong" : "danger",
        detail: detailOf(draft.capacity, professionalName, false),
        bandId: band.templateId,
        isEdited: false,
        canEdit: false,
        action: {
          label: draft.isOpen ? "No abrir" : "Abrir franja",
          isDanger: false,
          draftAction: { type: "toggleBand", templateId: band.templateId },
        },
      },
    ];
  }

  const existing = band.slots.map((slot): TurnoRow => {
    const slotState = slotDraftState(state, slot);
    // Only a slot that stays can carry edits; one that goes away shows what it had.
    const own = slotState === "active" ? slotValues(state, slot) : { professionalId: slot.professionalId, capacity: slot.capacity };
    const ownProfessional =
      own.professionalId === slot.professionalId ? slot.professionalName : professionalNameOf(editor, own.professionalId, null);
    const status = statusOf(slotState, slot.booked, own.capacity, slot.cancelReason, false);
    return {
      key: slot.id,
      time: formatSlotTime(slot.startsAt),
      state: slotState,
      statusText: status.text,
      statusTone: status.tone,
      detail: detailOf(own.capacity, ownProfessional, false),
      bandId: band.templateId,
      isEdited: slotState === "active" && slot.id in state.slotEdits,
      canEdit: slotState === "active",
      action: bandSlotAction(state, band, slot, slotState),
    };
  });

  const created = createdStarts(state, band).map((time): TurnoRow => {
    const status = statusOf("new", 0, draft.capacity, null, false);
    return {
      key: `new-${band.templateId}-${time}`,
      time,
      state: "new",
      statusText: status.text,
      statusTone: status.tone,
      detail: detailOf(draft.capacity, professionalName, false),
      bandId: band.templateId,
      isEdited: false,
      canEdit: false,
      action: null,
    };
  });

  return [...existing, ...created];
}

function individualRows(state: DayDraftState, service: ServiceType): TurnoRow[] {
  const { editor } = state;

  const existing = editor.individualSlots
    .filter((slot) => slot.service === service)
    .map((slot): TurnoRow => {
      const slotState = slotDraftState(state, slot);
      const status = statusOf(slotState, slot.booked, slot.capacity, slot.cancelReason, true);
      return {
        key: slot.id,
        time: formatSlotTime(slot.startsAt),
        state: slotState,
        statusText: status.text,
        statusTone: status.tone,
        detail: detailOf(slot.capacity, slot.professionalName, true),
        bandId: null,
        isEdited: false,
        canEdit: false,
        action: individualAction(slot, slotState),
      };
    });

  const added = state.addedSlots
    .filter((slot) => slot.service === service)
    .map((slot): TurnoRow => {
      const status = statusOf("new", 0, slot.capacity, null, true);
      return {
        key: slot.key,
        time: slot.startTime,
        state: "new",
        statusText: status.text,
        statusTone: status.tone,
        detail: detailOf(slot.capacity, professionalNameOf(editor, slot.professionalId, null), true),
        bandId: null,
        isEdited: false,
        canEdit: false,
        action: { label: "Quitar", isDanger: true, draftAction: { type: "removeSlot", key: slot.key } },
      };
    });

  return [...existing, ...added];
}

/** Every turno of a service that day, franjas and individual ones together, by time. */
export function buildTurnoRows(state: DayDraftState, service: ServiceType): TurnoRow[] {
  const bands = state.editor.services.find((entry) => entry.service === service)?.bands ?? [];
  return [...bands.flatMap((band) => bandRows(state, band)), ...individualRows(state, service)].sort((a, b) =>
    a.time.localeCompare(b.time),
  );
}

export type ChangeKind = "cancel" | "add" | "edit" | "close";

export interface ChangeItem {
  kind: ChangeKind;
  text: string;
  /** Shown after the text, muted: "1 reserva". */
  note?: string;
}

export interface ChangeGroup {
  scope: string;
  items: ChangeItem[];
}

function bookingsNote(count: number): string | undefined {
  return count > 0 ? pluralize(count, "reserva", "reservas") : undefined;
}

function joinNotes(...notes: (string | undefined)[]): string | undefined {
  const present = notes.filter((note): note is string => note !== undefined);
  return present.length > 0 ? present.join(" · ") : undefined;
}

function bandChanges(state: DayDraftState, band: DayBandDto): ChangeItem[] {
  const draft = state.bands[band.templateId];
  const name = `Franja ${band.label}`;

  if (!band.isOpen && draft.isOpen && band.slots.length === 0) return [{ kind: "add", text: `${name} se abre` }];

  const items: ChangeItem[] = [];
  for (const slot of band.slots) {
    const slotState = slotDraftState(state, slot);
    const time = formatSlotTime(slot.startsAt);
    if (slotState === "marked" || slotState === "dropped") {
      items.push({
        kind: "cancel",
        text: `Turno ${time} cancelado`,
        note: joinNotes(slotState === "dropped" ? "ya no entra en el horario" : undefined, bookingsNote(slot.booked)),
      });
    } else if (slotState === "reopening") {
      items.push({ kind: "add", text: `Turno ${time} se reabre` });
    } else if (slotState === "active") {
      items.push(...slotEditChanges(state, band, slot));
    }
  }
  for (const time of createdStarts(state, band)) items.push({ kind: "add", text: `Turno ${time} nuevo` });

  if (draft.startTime !== band.effective.startTime || draft.endTime !== band.effective.endTime) {
    items.push({ kind: "edit", text: `${name} · horario ${draft.startTime} – ${draft.endTime}` });
  }
  return items;
}

function slotEditChanges(state: DayDraftState, band: DayBandDto, slot: DayEditorSlotDto): ChangeItem[] {
  const edit = state.slotEdits[slot.id];
  if (!edit) return [];
  const time = formatSlotTime(slot.startsAt);
  const items: ChangeItem[] = [];
  if (edit.capacity !== undefined) {
    items.push({ kind: "edit", text: `Turno ${time} · cupo ${slot.capacity} → ${edit.capacity}` });
  }
  if (edit.professionalId !== undefined) {
    const professional = professionalNameOf(state.editor, edit.professionalId, null) ?? "sin profesional";
    const covers =
      edit.professionalId !== band.template.professionalId && band.template.professionalName
        ? ` (cubre a ${band.template.professionalName})`
        : "";
    items.push({ kind: "edit", text: `Turno ${time} · ${professional}${covers}` });
  }
  return items;
}

function individualChanges(state: DayDraftState, service: ServiceType): ChangeItem[] {
  const items: ChangeItem[] = [];
  for (const slot of state.editor.individualSlots.filter((candidate) => candidate.service === service)) {
    const slotState = slotDraftState(state, slot);
    const time = formatSlotTime(slot.startsAt);
    if (slotState === "marked") {
      items.push({ kind: "cancel", text: `Turno individual ${time} se quita`, note: bookingsNote(slot.booked) });
    } else if (slotState === "reopening") {
      items.push({ kind: "add", text: `Turno individual ${time} se reabre` });
    }
  }
  for (const slot of state.addedSlots.filter((candidate) => candidate.service === service)) {
    items.push({ kind: "add", text: `Turno individual ${slot.startTime} agregado` });
  }
  return items;
}

/** What saving would change on a single day, by service. Closing the day is summarised apart: see `closeDayChanges`. */
export function buildChangeGroups(state: DayDraftState): ChangeGroup[] {
  return SERVICE_ORDER.flatMap((service) => {
    const bands = state.editor.services.find((entry) => entry.service === service)?.bands ?? [];
    const items = [...bands.flatMap((band) => bandChanges(state, band)), ...individualChanges(state, service)];
    return items.length > 0 ? [{ scope: SERVICE_LABELS[service], items }] : [];
  });
}

/** The summary of closing the day (or the range): the day is closed and so many turnos go with it. */
export function closeDayChanges(scope: string, cancelledSlots: number, bookings: number): ChangeGroup[] {
  return [
    {
      scope,
      items: [
        { kind: "close", text: "Día cerrado" },
        { kind: "cancel", text: pluralize(cancelledSlots, "turno cancelado", "turnos cancelados"), note: bookingsNote(bookings) },
      ],
    },
  ];
}
