"use client";

import { useEffect, useRef, useState } from "react";

import { useSnackbar } from "@/components/ui/snackbar";
import { fetchOfflineOptions } from "@/features/checkout/checkout-api";
import type { BookableSlot, FailedSlotDto, OfflineOptionsDto, ServiceType, SlotEligibilityDto } from "@/lib/api/types";

import { UNPAID_LIMIT_REACHED, unpaidLimitSnackbar } from "./booking-error-actions";
import {
  bookedTitle,
  expandRepeat,
  type FailedGroup,
  failedSlotMessage,
  failedTitle,
  groupFailures,
  repeatPhrase,
} from "./booking-cart";
import {
  type CartState as SelectionState,
  EMPTY_CART,
  keepOnly,
  removeCartSlot,
  selectionSlots,
  startRepeating,
  stopRepeating,
  toggleCartSlot,
} from "./booking-cart-state";
import type { CartPolicy, CartState } from "./cart-policy";
import { CLIENT_CART_POLICY, MY_BOOKINGS_HREF } from "./client-cart-policy";
import { getBatchEligibility } from "./get-batch-eligibility";
import type { RepeatLimit } from "./repeat-limit";
import { todayBusinessDate } from "./slots";

const BATCH_FAILED_NOTICE = "No pudimos reservar. Probá de nuevo.";
const RANGE_FAILED_NOTICE = "No pudimos cargar las semanas siguientes.";
const SKIPPED_WEEKS_TITLE = "No hay lugar en algunas semanas";
const PAY_REHAB_MESSAGE = "Ahora pagá tu turno de Fisioterapia.";
export { MY_BOOKINGS_HREF };
const EMPTY_ELIGIBILITY = new Map<string, SlotEligibilityDto>();

export interface ServiceCartGroup {
  service: ServiceType;
  label: string;
  slots: BookableSlot[];
  isRepeating: boolean;
  canRepeat: boolean;
  repeatUntil: string | null;
  // Sentence describing the weekly pattern; built from the hand-picked slots, so it
  // doesn't change when a single repeated date is removed.
  phrase: string | null;
}

export type ConfirmOutcome = { kind: "stay" } | { kind: "checkout"; slot: BookableSlot };

export type BatchResult = { booked: readonly unknown[]; failed: FailedSlotDto[] };

export interface BookingCart extends CartState {
  groups: ServiceCartGroup[];
  count: number;
  /** Who is picking, so a saved selection is never restored for another account. */
  userId: string | null;
  isSelected(slotId: string): boolean;
  hasSlots(service: ServiceType): boolean;
  toggleSlot(slot: BookableSlot): void;
  // Adds every slot in one state update — looping `toggleSlot` would not work here, since
  // each call reads the same pre-toggle `state` snapshot and the last `setState` wins.
  // Meant for a fresh/empty cart (e.g. restoring a pick after returning from checkout).
  restoreSlots(slots: BookableSlot[]): void;
  removeSlot(slot: BookableSlot): void;
  setRepeating(service: ServiceType, on: boolean): Promise<void>;
  /** `book` sends the batch; the cart decides what goes in it and what to show about the result. */
  confirm(book: (batch: BookableSlot[]) => Promise<BatchResult>): Promise<ConfirmOutcome>;
  submitting: boolean;
  // Orientative, not a guarantee (no lock) — would the current plan/pack cover this slot
  // if confirmed right now? Null until the preview resolves, or for a slot outside the batch.
  eligibilityFor(slotId: string): SlotEligibilityDto | null;
  // True when the policy refuses to confirm the cart as it is (see `CartPolicy.blockingNotice`):
  // a shortfall already visible to the user never turns into a silent partial failure.
  hasBlockingIssue: boolean;
  policy: CartPolicy;
}

export interface UseBookingCartArgs {
  limitFor: (service: ServiceType) => RepeatLimit | null;
  labelOf: (service: ServiceType) => string;
  fetchRange: (service: ServiceType, from: string, to: string) => Promise<BookableSlot[]>;
  onBooked: () => void;
  userId?: string | null;
  policy?: CartPolicy;
  fetchEligibility?: (timeSlotIds: string[]) => Promise<SlotEligibilityDto[]>;
  /** What the client owes, asked only when a slot is refused for the unpaid cap. */
  fetchUnpaid?: () => Promise<OfflineOptionsDto["unpaid"]>;
}

const fetchUnpaidItems = () => fetchOfflineOptions().then((options) => options.unpaid);

function byStart(a: BookableSlot, b: BookableSlot): number {
  return a.startsAt.localeCompare(b.startsAt);
}

export function useBookingCart({
  limitFor,
  labelOf,
  fetchRange,
  onBooked,
  userId = null,
  policy = CLIENT_CART_POLICY,
  fetchEligibility = getBatchEligibility,
  fetchUnpaid = fetchUnpaidItems,
}: UseBookingCartArgs): BookingCart {
  const [state, setState] = useState<SelectionState>(EMPTY_CART);
  const [submitting, setSubmitting] = useState(false);
  // A ref, not state: two clicks in the same tick both see the same render's state.
  const isSubmittingRef = useRef(false);
  const { showSnackbar } = useSnackbar();

  const multiFor = (service: ServiceType) => policy.allowsMulti(service, limitFor(service));

  // A repeating service whose slots were all removed by hand keeps its pattern in state, but shows nowhere.
  const groups: ServiceCartGroup[] = state.order.map((service) => {
    const selection = state.byService[service]!;
    const limit = limitFor(service);
    const canRepeat = multiFor(service) && limit !== null;
    return {
      service,
      label: labelOf(service),
      slots: selectionSlots(selection, limit),
      isRepeating: selection.repeating,
      canRepeat,
      repeatUntil: canRepeat ? (limit?.untilDate ?? null) : null,
      phrase: selection.repeating && selection.picked.length > 0 ? repeatPhrase(selection.picked) : null,
    };
  }).filter((group) => group.slots.length > 0);
  const allSlots = groups.flatMap((group) => group.slots);

  // What the policy keeps out of the batch (the client's Rehab, paid through its own checkout)
  // has no entitlement to preview here — same scope as `confirm()`'s own `batch` filter.
  const batchSlots = allSlots.filter((slot) => policy.inBatch(slot.service)).sort(byStart);
  const batchIds = batchSlots.map((slot) => slot.id);
  const batchKey = batchIds.join(",");
  const [eligibility, setEligibility] = useState<Map<string, SlotEligibilityDto>>(new Map());
  // Which batch the last answer (or failure) was for: any other batch is still loading.
  const [preview, setPreview] = useState<{ key: string; failed: boolean }>({ key: "", failed: false });

  useEffect(() => {
    if (batchIds.length === 0) return;
    let cancelled = false;
    fetchEligibility(batchIds)
      .then((results) => {
        if (cancelled) return;
        setEligibility(new Map(results.map((result) => [result.timeSlotId, result])));
        setPreview({ key: batchKey, failed: false });
      })
      .catch(() => {
        // A failed preview is not an error for the user: it just means no advisory shows,
        // the real (authoritative) check still runs at confirm time.
        if (cancelled) return;
        setEligibility(new Map());
        setPreview({ key: batchKey, failed: true });
      });
    return () => {
      cancelled = true;
    };
    // batchKey (not batchIds, a new array every render) is the real dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batchKey]);

  const effectiveEligibility = batchIds.length === 0 ? EMPTY_ELIGIBILITY : eligibility;
  const previewStatus: CartState["previewStatus"] =
    batchIds.length === 0 ? "idle" : preview.key !== batchKey ? "loading" : preview.failed ? "error" : "ready";
  const eligibilityOf = (slotId: string) => effectiveEligibility.get(slotId) ?? null;
  const policyState: CartState = { batch: batchSlots, eligibilityOf, previewStatus };
  const hasBlockingIssue = policy.blockingNotice(policyState) !== null;

  function warnSkipped(skipped: BookableSlot[]) {
    if (skipped.length === 0) return;
    showSnackbar({ tone: "warning", title: SKIPPED_WEEKS_TITLE, items: skipped.map(failedSlotMessage) });
  }

  function toggleSlot(slot: BookableSlot) {
    const result = toggleCartSlot(state, slot, { multi: multiFor(slot.service), limit: limitFor(slot.service) });
    setState(result.state);
    warnSkipped(result.skipped);
  }

  function restoreSlots(slots: BookableSlot[]) {
    let next = state;
    const allSkipped: BookableSlot[] = [];
    for (const slot of slots) {
      const result = toggleCartSlot(next, slot, { multi: multiFor(slot.service), limit: limitFor(slot.service) });
      next = result.state;
      allSkipped.push(...result.skipped);
    }
    setState(next);
    warnSkipped(allSkipped);
  }

  async function setRepeating(service: ServiceType, on: boolean) {
    if (!on) {
      setState((current) => stopRepeating(current, service));
      return;
    }
    const limit = limitFor(service);
    const selection = state.byService[service];
    if (!limit || !multiFor(service) || !selection || selection.picked.length === 0) return;
    try {
      const fetched = await fetchRange(service, todayBusinessDate(), limit.untilDate);
      setState((current) => startRepeating(current, service, fetched));
      warnSkipped(expandRepeat(selection.picked, fetched, limit).skipped);
    } catch {
      showSnackbar({ tone: "danger", title: RANGE_FAILED_NOTICE });
    }
  }

  // The green snackbar goes first so the red one, shown after it, ends up above it.
  function showPartialResult(
    bookedCount: number,
    failed: FailedSlotDto[],
    groups: FailedGroup[],
    slotFor: (id: string) => BookableSlot | undefined,
  ) {
    if (bookedCount > 0) {
      showSnackbar({
        tone: "success",
        title: bookedTitle(bookedCount),
        action: policy.bookedAction,
      });
    }
    const unpaidGroup = groups.find((group) => group.code === UNPAID_LIMIT_REACHED);
    const otherGroups = groups.filter((group) => group !== unpaidGroup);
    const otherFailed = failed.filter((failure) => failure.code !== UNPAID_LIMIT_REACHED);
    if (otherGroups.length > 0) {
      showSnackbar({
        tone: "danger",
        title: failedTitle(otherFailed.length),
        groups: otherGroups.map((group) => ({ items: group.turns, note: group.reason })),
        actions: policy.failureActions(otherFailed, otherGroups, slotFor),
      });
    }
    if (unpaidGroup) void showUnpaidLimit(unpaidGroup.reason);
  }

  // Not awaited by the confirm: the notice shows when the list of what the client owes arrives.
  async function showUnpaidLimit(reason: string) {
    const unpaid = await fetchUnpaid().catch(() => null);
    showSnackbar(unpaidLimitSnackbar(reason, unpaid));
  }

  async function confirm(book: (batch: BookableSlot[]) => Promise<BatchResult>): Promise<ConfirmOutcome> {
    if (allSlots.length === 0 || isSubmittingRef.current) return { kind: "stay" };
    if (hasBlockingIssue) return { kind: "stay" };
    const checkoutSlot = allSlots.find((slot) => !policy.inBatch(slot.service)) ?? null;
    const batch = batchSlots;
    if (batch.length === 0) return checkoutSlot ? { kind: "checkout", slot: checkoutSlot } : { kind: "stay" };

    isSubmittingRef.current = true;
    setSubmitting(true);
    try {
      const result = await book(batch);
      setState((current) => (checkoutSlot ? keepOnly(current, checkoutSlot.service) : EMPTY_CART));
      onBooked();

      const bySlotId = new Map(batch.map((slot) => [slot.id, slot]));
      const failedGroups = groupFailures(result.failed, bySlotId, labelOf);
      const bookedCount = batch.length - result.failed.length;

      if (failedGroups.length > 0) {
        showPartialResult(bookedCount, result.failed, failedGroups, (id) => bySlotId.get(id));
        return { kind: "stay" };
      }
      if (checkoutSlot) {
        showSnackbar({ tone: "success", title: bookedTitle(bookedCount), message: PAY_REHAB_MESSAGE });
        return { kind: "checkout", slot: checkoutSlot };
      }
      showSnackbar({ tone: "success", title: bookedTitle(bookedCount), action: policy.bookedAction });
      return { kind: "stay" };
    } catch {
      showSnackbar({ tone: "danger", title: BATCH_FAILED_NOTICE });
      return { kind: "stay" };
    } finally {
      isSubmittingRef.current = false;
      setSubmitting(false);
    }
  }

  return {
    groups,
    count: allSlots.length,
    isSelected: (slotId) => allSlots.some((slot) => slot.id === slotId),
    hasSlots: (service) => groups.some((group) => group.service === service),
    toggleSlot,
    restoreSlots,
    removeSlot: (slot) => setState((current) => removeCartSlot(current, slot)),
    setRepeating,
    confirm,
    submitting,
    eligibilityFor: eligibilityOf,
    eligibilityOf,
    batch: batchSlots,
    previewStatus,
    hasBlockingIssue,
    policy,
    userId,
  };
}
