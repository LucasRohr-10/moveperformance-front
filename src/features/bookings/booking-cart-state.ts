import type { BookableSlot, ServiceType } from "@/lib/api/types";

import { expandRepeat } from "./booking-cart";
import type { RepeatLimit } from "./repeat-limit";

export interface ServiceSelection {
  picked: BookableSlot[];
  repeating: boolean;
  // Every slot of the service up to the repeat limit, fetched when repeating starts.
  candidates: BookableSlot[];
  // Expanded weekly slots the client took out by hand.
  removedIds: string[];
}

// One selection per service; `order` is the order each service got its first slot.
export interface CartState {
  order: ServiceType[];
  byService: Partial<Record<ServiceType, ServiceSelection>>;
}

export const EMPTY_CART: CartState = { order: [], byService: {} };

const EMPTY_SELECTION: ServiceSelection = { picked: [], repeating: false, candidates: [], removedIds: [] };

function byStart(a: BookableSlot, b: BookableSlot): number {
  return a.startsAt.localeCompare(b.startsAt);
}

export function selectionSlots(selection: ServiceSelection, limit: RepeatLimit | null): BookableSlot[] {
  if (selection.repeating && limit) {
    return expandRepeat(selection.picked, selection.candidates, limit).slots.filter(
      (s) => !selection.removedIds.includes(s.id),
    );
  }
  return [...selection.picked].sort(byStart);
}

function withSelection(state: CartState, service: ServiceType, selection: ServiceSelection): CartState {
  if (selection.picked.length === 0) {
    const byService = { ...state.byService };
    delete byService[service];
    return { order: state.order.filter((s) => s !== service), byService };
  }
  return {
    order: state.order.includes(service) ? state.order : [...state.order, service],
    byService: { ...state.byService, [service]: selection },
  };
}

function selectionOf(state: CartState, service: ServiceType): ServiceSelection {
  return state.byService[service] ?? EMPTY_SELECTION;
}

export function toggleCartSlot(
  state: CartState,
  slot: BookableSlot,
  { multi, limit }: { multi: boolean; limit: RepeatLimit | null },
): { state: CartState; skipped: BookableSlot[] } {
  const current = selectionOf(state, slot.service);
  const isPicked = current.picked.some((s) => s.id === slot.id);

  if (!multi) {
    return { state: withSelection(state, slot.service, { ...current, picked: isPicked ? [] : [slot] }), skipped: [] };
  }
  if (current.repeating && limit) {
    if (current.removedIds.includes(slot.id)) {
      const removedIds = current.removedIds.filter((id) => id !== slot.id);
      return { state: withSelection(state, slot.service, { ...current, removedIds }), skipped: [] };
    }
    if (selectionSlots(current, limit).some((s) => s.id === slot.id)) {
      const removedIds = [...current.removedIds, slot.id];
      return { state: withSelection(state, slot.service, { ...current, removedIds }), skipped: [] };
    }
    const picked = [...current.picked, slot];
    return {
      state: withSelection(state, slot.service, { ...current, picked }),
      skipped: expandRepeat(picked, current.candidates, limit).skipped,
    };
  }
  const picked = isPicked ? current.picked.filter((s) => s.id !== slot.id) : [...current.picked, slot];
  return { state: withSelection(state, slot.service, { ...current, picked }), skipped: [] };
}

export function removeCartSlot(state: CartState, slot: BookableSlot): CartState {
  const current = selectionOf(state, slot.service);
  if (current.repeating) {
    if (current.removedIds.includes(slot.id)) return state;
    return withSelection(state, slot.service, { ...current, removedIds: [...current.removedIds, slot.id] });
  }
  return withSelection(state, slot.service, { ...current, picked: current.picked.filter((s) => s.id !== slot.id) });
}

export function startRepeating(state: CartState, service: ServiceType, candidates: BookableSlot[]): CartState {
  return withSelection(state, service, { ...selectionOf(state, service), repeating: true, candidates, removedIds: [] });
}

export function stopRepeating(state: CartState, service: ServiceType): CartState {
  return withSelection(state, service, {
    ...selectionOf(state, service),
    repeating: false,
    candidates: [],
    removedIds: [],
  });
}

export function keepOnly(state: CartState, service: ServiceType): CartState {
  const kept = state.byService[service];
  return kept ? { order: [service], byService: { [service]: kept } } : EMPTY_CART;
}
