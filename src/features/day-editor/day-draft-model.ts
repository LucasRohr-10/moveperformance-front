import { formatSlotTime } from "@/features/bookings/slots";
import type {
  DayBandDto,
  DayBandDraftDto,
  DayDraftDto,
  DayEditorDto,
  DayEditorSlotDto,
  NewSlotDto,
  ServiceType,
} from "@/lib/api/types";

import { SERVICE_LABELS, daypartOf } from "./band-labels";
import { expandDayStarts } from "./expand-day-starts";

// The draft is everything the staff changed and nothing else: it never touches the API.
// It keeps the editor it started from, so every derived number can be recomputed from the state alone.

export type NewSlotInput = NewSlotDto;

export interface LocalNewSlot extends NewSlotInput {
  /** Local id, to quit the slot before it exists. */
  key: string;
}

/** What a band looks like in the draft (starts as the band's effective values). */
export interface BandDraft {
  isOpen: boolean;
  startTime: string;
  endTime: string;
  professionalId: string | null;
  capacity: number;
}

/** What staff changed on one slot; a field is only here while it differs from what is saved. */
export interface SlotEditDraft {
  professionalId?: string | null;
  capacity?: number;
}

export interface DayDraftState {
  editor: DayEditorDto;
  closeWholeDay: boolean;
  /** By template id. */
  bands: Record<string, BandDraft>;
  /** By slot id: a slot's own professional and capacity. */
  slotEdits: Record<string, SlotEditDraft>;
  /** Active slots marked to cancel one by one. */
  cancelSlotIds: string[];
  /** Cancelled slots marked to open again. */
  reopenSlotIds: string[];
  addedSlots: LocalNewSlot[];
  /** Individual slots that already exist and are marked to quit. */
  removedSlotIds: string[];
  reason: string;
}

export type DraftAction =
  | { type: "toggleCloseDay" }
  | { type: "toggleBand"; templateId: string }
  | { type: "setBandHours"; templateId: string; startTime: string; endTime: string }
  | { type: "setBandProfessional"; templateId: string; professionalId: string | null }
  | { type: "setBandCapacity"; templateId: string; capacity: number }
  | { type: "setSlotProfessional"; slotId: string; professionalId: string | null }
  | { type: "setSlotCapacity"; slotId: string; capacity: number }
  // Puts one slot back as it was loaded.
  | { type: "resetSlot"; slotId: string }
  | { type: "toggleSlotCancel"; slotId: string }
  | { type: "reopenSlot"; slotId: string }
  | { type: "addSlot"; slot: NewSlotInput }
  // key: id of an existing individual slot, or the local key of a new one.
  | { type: "removeSlot"; key: string }
  | { type: "setReason"; reason: string }
  | { type: "reset" };

export type SlotDraftState =
  /** Stays as is. */
  | "active"
  /** Marked to cancel on save: by hand, by closing its band or the day, or because the slot is being quit. */
  | "marked"
  /** Cancelled because the band's new hours no longer fit it. */
  | "dropped"
  /** Already cancelled by staff. */
  | "cancelled"
  /** Cancelled by staff and marked to open again. */
  | "reopening"
  | "started";

interface BandRef {
  service: ServiceType;
  band: DayBandDto;
  siblings: DayBandDto[];
}

function bandRefs(editor: DayEditorDto): BandRef[] {
  return editor.services.flatMap(({ service, bands }) =>
    bands.map((band) => ({ service, band, siblings: bands })),
  );
}

type SlotOwner =
  | { kind: "band"; ref: BandRef; slot: DayEditorSlotDto }
  | { kind: "individual"; service: ServiceType; slot: DayEditorSlotDto };

function findSlot(editor: DayEditorDto, slotId: string): SlotOwner | null {
  for (const ref of bandRefs(editor)) {
    const slot = ref.band.slots.find((candidate) => candidate.id === slotId);
    if (slot) return { kind: "band", ref, slot };
  }
  const individual = editor.individualSlots.find((candidate) => candidate.id === slotId);
  return individual ? { kind: "individual", service: individual.service, slot: individual } : null;
}

function bandDraftOf(band: DayBandDto): BandDraft {
  return {
    isOpen: band.isOpen,
    startTime: band.effective.startTime,
    endTime: band.effective.endTime,
    professionalId: band.effective.professionalId,
    capacity: band.effective.capacity,
  };
}

export function initialDraft(editor: DayEditorDto): DayDraftState {
  return {
    editor,
    closeWholeDay: false,
    bands: Object.fromEntries(bandRefs(editor).map(({ band }) => [band.templateId, bandDraftOf(band)])),
    slotEdits: {},
    cancelSlotIds: [],
    reopenSlotIds: [],
    addedSlots: [],
    removedSlotIds: [],
    reason: "",
  };
}

function toggled(list: string[], id: string): string[] {
  return list.includes(id) ? list.filter((item) => item !== id) : [...list, id];
}

function withBand(state: DayDraftState, templateId: string, change: Partial<BandDraft>): DayDraftState {
  const current = state.bands[templateId];
  if (!current) return state;
  return { ...state, bands: { ...state.bands, [templateId]: { ...current, ...change } } };
}

// Keeps only what differs from the saved slot, so editing a value back to what it was leaves no edit behind.
function withSlotEdit(state: DayDraftState, slotId: string, patch: SlotEditDraft): DayDraftState {
  const owner = findSlot(state.editor, slotId);
  if (!owner || owner.slot.state !== "active") return state;
  const merged = { ...state.slotEdits[slotId], ...patch };
  const edit: SlotEditDraft = {
    ...(merged.professionalId !== undefined && merged.professionalId !== owner.slot.professionalId
      ? { professionalId: merged.professionalId }
      : {}),
    ...(merged.capacity !== undefined && merged.capacity !== owner.slot.capacity ? { capacity: merged.capacity } : {}),
  };
  return { ...state, slotEdits: withoutKey(state.slotEdits, slotId, edit) };
}

function withoutKey(
  edits: Record<string, SlotEditDraft>,
  slotId: string,
  replacement?: SlotEditDraft,
): Record<string, SlotEditDraft> {
  const others = Object.fromEntries(Object.entries(edits).filter(([key]) => key !== slotId));
  return replacement && Object.keys(replacement).length > 0 ? { ...others, [slotId]: replacement } : others;
}

/** What a slot runs with once the draft is applied: its own edits over what is saved. */
export function slotValues(state: DayDraftState, slot: DayEditorSlotDto): { professionalId: string | null; capacity: number } {
  const edit = state.slotEdits[slot.id];
  return {
    professionalId: edit?.professionalId !== undefined ? edit.professionalId : slot.professionalId,
    capacity: edit?.capacity ?? slot.capacity,
  };
}

function nextLocalKey(addedSlots: LocalNewSlot[]): string {
  const highest = Math.max(0, ...addedSlots.map((added) => Number(added.key.replace("new-", ""))));
  return `new-${highest + 1}`;
}

export function draftReducer(state: DayDraftState, action: DraftAction): DayDraftState {
  switch (action.type) {
    case "toggleCloseDay":
      return { ...state, closeWholeDay: !state.closeWholeDay };
    case "toggleBand": {
      const current = state.bands[action.templateId];
      return current ? withBand(state, action.templateId, { isOpen: !current.isOpen }) : state;
    }
    case "setBandHours":
      return withBand(state, action.templateId, { startTime: action.startTime, endTime: action.endTime });
    case "setBandProfessional":
      return withBand(state, action.templateId, { professionalId: action.professionalId });
    case "setBandCapacity":
      return withBand(state, action.templateId, { capacity: action.capacity });
    case "setSlotProfessional":
      return withSlotEdit(state, action.slotId, { professionalId: action.professionalId });
    case "setSlotCapacity":
      return withSlotEdit(state, action.slotId, { capacity: action.capacity });
    case "resetSlot":
      return { ...state, slotEdits: withoutKey(state.slotEdits, action.slotId) };
    case "toggleSlotCancel": {
      const owner = findSlot(state.editor, action.slotId);
      if (!owner || owner.slot.state === "started") return state;
      if (owner.slot.state === "cancelled") {
        // Only undoes a reopening; cancelling something already cancelled is nothing.
        return state.reopenSlotIds.includes(action.slotId)
          ? { ...state, reopenSlotIds: toggled(state.reopenSlotIds, action.slotId) }
          : state;
      }
      if (owner.kind === "individual") return state;
      return { ...state, cancelSlotIds: toggled(state.cancelSlotIds, action.slotId) };
    }
    case "reopenSlot": {
      const owner = findSlot(state.editor, action.slotId);
      if (!owner || owner.slot.state !== "cancelled" || state.reopenSlotIds.includes(action.slotId)) return state;
      return { ...state, reopenSlotIds: [...state.reopenSlotIds, action.slotId] };
    }
    case "addSlot":
      return { ...state, addedSlots: [...state.addedSlots, { ...action.slot, key: nextLocalKey(state.addedSlots) }] };
    case "removeSlot": {
      if (state.addedSlots.some((added) => added.key === action.key)) {
        return { ...state, addedSlots: state.addedSlots.filter((added) => added.key !== action.key) };
      }
      const existing = state.editor.individualSlots.find((individual) => individual.id === action.key);
      if (!existing || existing.state !== "active") return state;
      return { ...state, removedSlotIds: toggled(state.removedSlotIds, action.key) };
    }
    case "setReason":
      return { ...state, reason: action.reason };
    case "reset":
      return initialDraft(state.editor);
  }
}

function hoursChanged(band: DayBandDto, draft: BandDraft): boolean {
  return draft.startTime !== band.effective.startTime || draft.endTime !== band.effective.endTime;
}

function isDroppedByHours(band: DayBandDto, draft: BandDraft, slot: DayEditorSlotDto): boolean {
  if (!hoursChanged(band, draft)) return false;
  const starts = expandDayStarts(draft.startTime, draft.endTime, band.durationMinutes, band.gapMinutes);
  return !starts.includes(formatSlotTime(slot.startsAt));
}

export function slotDraftState(state: DayDraftState, slot: DayEditorSlotDto): SlotDraftState {
  if (slot.state === "started") return "started";
  const owner = findSlot(state.editor, slot.id);
  const bandOwner = owner?.kind === "band" ? owner.ref.band : null;

  if (slot.state === "cancelled") {
    const bandReopened = bandOwner && !bandOwner.isOpen && state.bands[bandOwner.templateId]?.isOpen;
    return state.reopenSlotIds.includes(slot.id) || bandReopened ? "reopening" : "cancelled";
  }

  if (state.closeWholeDay) return "marked";
  if (!bandOwner) return state.removedSlotIds.includes(slot.id) ? "marked" : "active";

  const draft = state.bands[bandOwner.templateId];
  if (!draft.isOpen || state.cancelSlotIds.includes(slot.id)) return "marked";
  return isDroppedByHours(bandOwner, draft, slot) ? "dropped" : "active";
}

/** Start times ("HH:mm") the band's draft hours would create where no slot exists yet. */
export function createdStarts(state: DayDraftState, band: DayBandDto): string[] {
  const draft = state.bands[band.templateId];
  if (!draft || band.slots.length === 0 || !draft.isOpen || !hoursChanged(band, draft)) return [];
  const existing = band.slots.map((slot) => formatSlotTime(slot.startsAt));
  return expandDayStarts(draft.startTime, draft.endTime, band.durationMinutes, band.gapMinutes).filter(
    (start) => !existing.includes(start),
  );
}

interface CancelledPart {
  service: ServiceType;
  /** A single slot ("09:00") or a whole band ("franja de la tarde (3)"). */
  text: string;
  isBand: boolean;
}

function listCancelled(state: DayDraftState): { parts: CancelledPart[]; slots: number; bookings: number } {
  const { editor } = state;
  const parts: CancelledPart[] = [];
  let slots = 0;
  let bookings = 0;

  if (state.closeWholeDay) {
    const bandSlots = bandRefs(editor).flatMap(({ band }) =>
      band.slots.length > 0 ? band.slots.filter((slot) => slot.state === "active") : [],
    );
    const rangeBands = bandRefs(editor).filter(({ band }) => band.slots.length === 0);
    const individuals = editor.individualSlots.filter((slot) => slot.state === "active");
    slots =
      bandSlots.length +
      individuals.length +
      rangeBands.reduce((sum, { band }) => sum + band.activeSlots, 0);
    bookings =
      [...bandSlots, ...individuals].reduce((sum, slot) => sum + slot.booked, 0) +
      rangeBands.reduce((sum, { band }) => sum + band.bookedCount, 0);
    return { parts: [], slots, bookings };
  }

  for (const { service, band } of bandRefs(editor)) {
    const draft = state.bands[band.templateId];
    const closedNow = band.isOpen && !draft.isOpen;
    if (band.slots.length === 0) {
      // Range: only counts from the band's totals, and only when it is closed.
      if (!closedNow) continue;
      slots += band.activeSlots;
      bookings += band.bookedCount;
      parts.push({ service, text: `franja de la ${daypartOf(band.template.startTime)} (${band.activeSlots})`, isBand: true });
      continue;
    }
    const marked = band.slots.filter((slot) => ["marked", "dropped"].includes(slotDraftState(state, slot)));
    slots += marked.length;
    bookings += marked.reduce((sum, slot) => sum + slot.booked, 0);
    if (closedNow) {
      parts.push({ service, text: `franja de la ${daypartOf(band.template.startTime)} (${marked.length})`, isBand: true });
    } else {
      for (const slot of marked) parts.push({ service, text: formatSlotTime(slot.startsAt), isBand: false });
    }
  }

  for (const slot of editor.individualSlots) {
    if (slotDraftState(state, slot) !== "marked") continue;
    slots += 1;
    bookings += slot.booked;
    parts.push({ service: slot.service, text: formatSlotTime(slot.startsAt), isBand: false });
  }

  return { parts, slots, bookings };
}

// Singles first, then bands; a band repeats the service only when the part before it is another one.
function describeCancelled(parts: CancelledPart[], isWholeDay: boolean): string {
  if (isWholeDay) return "Todos los turnos del día";
  const ordered = [...parts.filter((part) => !part.isBand), ...parts.filter((part) => part.isBand)];
  return ordered
    .map((part, index) =>
      part.isBand && ordered[index - 1]?.service === part.service
        ? part.text
        : `${SERVICE_LABELS[part.service]} ${part.text}`,
    )
    .join(" · ");
}

function professionalName(editor: DayEditorDto, professionalId: string | null): string | null {
  return editor.professionals.find((professional) => professional.id === professionalId)?.name ?? null;
}

function describeProfessionalChanges(state: DayDraftState): { count: number; detail: string } {
  const details = bandRefs(state.editor).flatMap(({ service, band }) => {
    const draft = state.bands[band.templateId];
    if (draft.professionalId === band.effective.professionalId) return [];
    const name = professionalName(state.editor, draft.professionalId) ?? "sin profesional";
    const covers =
      draft.professionalId !== band.template.professionalId && band.template.professionalName
        ? ` cubre a ${band.template.professionalName}`
        : "";
    return [`${SERVICE_LABELS[service]}: ${name}${covers}`];
  });
  return { count: details.length, detail: details.join(" · ") };
}

export interface LocalSummary {
  cancelledSlots: { count: number; detail: string };
  professionalChanges: { count: number; detail: string };
  addedSlots: { count: number; detail: string };
  /** Counted from the loaded slots; the number that rules is the backend preview's. */
  bookingsInCancelledSlots: number;
  isDirty: boolean;
  needsReason: boolean;
}

function sameBandDraft(a: BandDraft, b: BandDraft): boolean {
  return (
    a.isOpen === b.isOpen &&
    a.startTime === b.startTime &&
    a.endTime === b.endTime &&
    a.professionalId === b.professionalId &&
    a.capacity === b.capacity
  );
}

function isDirty(state: DayDraftState): boolean {
  const initial = initialDraft(state.editor);
  return (
    state.closeWholeDay ||
    state.cancelSlotIds.length > 0 ||
    state.reopenSlotIds.length > 0 ||
    state.addedSlots.length > 0 ||
    state.removedSlotIds.length > 0 ||
    Object.keys(state.slotEdits).length > 0 ||
    Object.entries(state.bands).some(([templateId, draft]) => !sameBandDraft(draft, initial.bands[templateId]))
  );
}

export function localSummary(state: DayDraftState, editor: DayEditorDto): LocalSummary {
  const cancelled = listCancelled({ ...state, editor });
  const added = state.closeWholeDay ? [] : state.addedSlots;
  return {
    cancelledSlots: { count: cancelled.slots, detail: describeCancelled(cancelled.parts, state.closeWholeDay) },
    professionalChanges: describeProfessionalChanges(state),
    addedSlots: {
      count: added.length,
      detail: added.map((slot) => `${SERVICE_LABELS[slot.service]} ${slot.startTime}`).join(" · "),
    },
    bookingsInCancelledSlots: cancelled.bookings,
    isDirty: isDirty(state),
    needsReason: cancelled.slots > 0,
  };
}

function changedBandDto(band: DayBandDto, draft: BandDraft): DayBandDraftDto | null {
  const hours = hoursChanged(band, draft);
  const professional = draft.professionalId !== band.effective.professionalId;
  const capacity = draft.capacity !== band.effective.capacity;
  if (draft.isOpen === band.isOpen && !hours && !professional && !capacity) return null;
  return {
    templateId: band.templateId,
    isOpen: draft.isOpen,
    ...(hours ? { startTime: draft.startTime, endTime: draft.endTime } : {}),
    ...(professional ? { professionalId: draft.professionalId } : {}),
    ...(capacity ? { capacity: draft.capacity } : {}),
  };
}

/** What the API gets: only what changed, never a slot that already started. */
export function toDraftDto(state: DayDraftState): DayDraftDto {
  const { editor } = state;
  const reason = state.reason.trim();
  const base = {
    from: editor.from,
    ...(editor.isRange ? { to: editor.to } : {}),
    ...(reason ? { reason } : {}),
  };

  if (state.closeWholeDay) {
    return { ...base, closeWholeDay: true, bands: [], slotEdits: [], cancelSlotIds: [], reopenSlotIds: [], addSlots: [], removeSlotIds: [] };
  }

  const bands = bandRefs(editor).flatMap(({ band }) => {
    const dto = changedBandDto(band, state.bands[band.templateId]);
    return dto ? [dto] : [];
  });
  // A slot of a band that closes goes with the band; it needs no id of its own.
  const cancelSlotIds = state.cancelSlotIds.filter((id) => {
    const owner = findSlot(editor, id);
    if (!owner || owner.slot.state !== "active") return false;
    return owner.kind !== "band" || state.bands[owner.ref.band.templateId].isOpen;
  });

  // A slot that goes away with the draft needs no edit of its own.
  const slotEdits = Object.entries(state.slotEdits).flatMap(([slotId, edit]) => {
    const owner = findSlot(editor, slotId);
    const isGoingAway =
      !owner ||
      owner.slot.state !== "active" ||
      state.cancelSlotIds.includes(slotId) ||
      (owner.kind === "band" && !state.bands[owner.ref.band.templateId].isOpen);
    return isGoingAway ? [] : [{ slotId, ...edit }];
  });

  return {
    ...base,
    bands,
    slotEdits,
    cancelSlotIds,
    reopenSlotIds: state.reopenSlotIds,
    addSlots: state.addedSlots.map(({ service, startTime, durationMinutes, capacity, professionalId }) => ({
      service,
      startTime,
      durationMinutes,
      capacity,
      professionalId,
    })),
    removeSlotIds: state.removedSlotIds,
  };
}
