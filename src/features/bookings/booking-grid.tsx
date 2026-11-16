"use client";

import { useRouter } from "next/navigation";
import { type ReactNode, useEffect, useRef, useState } from "react";

import { useSnackbar } from "@/components/ui/snackbar";
import { bookingCheckoutHref } from "@/features/checkout/checkout-routes";
import { BookingPlanBanner } from "@/features/subscriptions/booking-plan-banner";
import { presentSubscriptions } from "@/features/subscriptions/present-subscriptions";
import type { BookableSlot, MySubscriptionsDto, ServiceType, SlotEligibilityDto } from "@/lib/api/types";
import { cn } from "@/lib/cn";

import { BookingGridDesktop } from "./booking-grid-desktop";
import { BookingGridMobile } from "./booking-grid-mobile";
import type { CartPolicy } from "./cart-policy";
import { CLIENT_CART_POLICY } from "./client-cart-policy";
import { createBookings } from "./create-bookings";
import { getBatchEligibility } from "./get-batch-eligibility";
import { getBookableSlots } from "./get-bookable-slots";
import { clearPendingSlotIntent, readPendingSlotIntentState } from "./pending-slot-intent";
import { repeatLimitFor } from "./repeat-limit";
import { SERVICE_OPTIONS } from "./service-options";
import { isSlotSelectable, slotLabel, toBusinessDate } from "./slots";
import { type BookingCart, useBookingCart } from "./use-booking-cart";
import { useSlotSelection } from "./use-slot-selection";

export interface BookingGridProps {
  initialService?: ServiceType;
  subscriptions?: MySubscriptionsDto | null;
  userId?: string | null;
  /** The slots to pick from; the client's own by default. */
  fetchSlots?: (service: ServiceType, date: string) => Promise<BookableSlot[]>;
  /** What the plan would cover for each slot of the cart, in order. */
  fetchEligibility?: (timeSlotIds: string[]) => Promise<SlotEligibilityDto[]>;
  policy?: CartPolicy;
  /** A spot under each slot of the cart. */
  renderSlotExtra?: (slot: BookableSlot) => ReactNode;
  showPlanBanner?: boolean;
  /** What the confirm button does; by default, book the batch and go to checkout when Rehab is left. */
  onConfirm?: (cart: BookingCart) => void;
}

const SELECTION_EXPIRED_TITLE = "Tu selección anterior venció. Elegí los horarios de nuevo.";
const RESTORE_FAILED_TITLE = "No pudimos recuperar tu selección anterior. Probá de nuevo.";

export function BookingGrid({
  initialService,
  subscriptions = null,
  userId = null,
  fetchSlots = getBookableSlots,
  fetchEligibility = getBatchEligibility,
  policy = CLIENT_CART_POLICY,
  renderSlotExtra,
  showPlanBanner = true,
  onConfirm,
}: BookingGridProps = {}) {
  const router = useRouter();
  const selection = useSlotSelection(initialService ?? "performance", {
    fetchSlots,
    // Occupancy is shown by color; text only explains why a cell can't be picked.
    labelFor: (slot) => (isSlotSelectable(slot) ? "" : slotLabel(slot)),
    hintFor: policy.slotHint,
  });

  // The page can stay mounted while the URL's ?service= changes (e.g. the dashboard's
  // Recovery link after a first visit), and a useState seed is only read on mount. A link
  // without a service leaves the user's current tab alone.
  const [followedService, setFollowedService] = useState(initialService);
  if (initialService !== followedService) {
    setFollowedService(initialService);
    if (initialService && initialService !== selection.service) selection.setService(initialService);
  }

  const subscriptionsModel = subscriptions ? presentSubscriptions(subscriptions) : null;
  const lastBookableDate = selection.lastBookableDate;
  const cart = useBookingCart({
    limitFor: (service) => (lastBookableDate ? repeatLimitFor(service, subscriptions, lastBookableDate) : null),
    labelOf: (service) => SERVICE_OPTIONS.find((option) => option.value === service)?.label ?? service,
    fetchRange: selection.fetchRange,
    onBooked: selection.refresh,
    userId,
    policy,
    fetchEligibility,
  });
  const { showSnackbar } = useSnackbar();

  // Runs at most once per mount, and only after the booking window has landed: the repeat
  // limits derive from it, and restoring before it arrives silently truncates the pick.
  const restoreStartedRef = useRef(false);

  useEffect(() => {
    if (!policy.restoresSavedPick || restoreStartedRef.current || selection.lastBookableDate === null) return;

    const saved = readPendingSlotIntentState(userId);
    // It timed out while the user was away paying: say so rather than quietly showing an
    // empty grid. Neither the purchase nor a paid booking is affected by this expiry.
    if (saved.status === "expired") {
      restoreStartedRef.current = true;
      showSnackbar({ tone: "warning", title: SELECTION_EXPIRED_TITLE });
      return;
    }
    if (saved.status !== "ready") return;
    const intent = saved.intent;
    if (intent.surface !== "bookings" || intent.slots.length === 0) return;

    restoreStartedRef.current = true;
    let cancelled = false;

    void (async () => {
      // A pick spans whatever weeks and services the user chose, so it is looked up by its
      // own dates. Reading it off the week that happens to be on screen reported every slot
      // in any other week as taken — they were there all along, just not in that tab.
      const datesByService = new Map<ServiceType, Set<string>>();
      intent.slots.forEach((item) => {
        const dates = datesByService.get(item.service) ?? new Set<string>();
        dates.add(toBusinessDate(item.startsAt));
        datesByService.set(item.service, dates);
      });

      let slots: BookableSlot[];
      try {
        const perService = await Promise.all(
          Array.from(datesByService, ([service, dates]) =>
            Promise.all(Array.from(dates, (date) => selection.fetchRange(service, date, date))),
          ),
        );
        slots = perService.flat(2);
      } catch {
        // The pick is kept: a failed lookup is not evidence that anything is gone.
        if (!cancelled) {
          restoreStartedRef.current = false;
          showSnackbar({ tone: "danger", title: RESTORE_FAILED_TITLE });
        }
        return;
      }
      if (cancelled) return;

      clearPendingSlotIntent();
      const targetIds = new Set(intent.slots.map((item) => item.slotId));
      const found = slots.filter((slot) => targetIds.has(slot.id) && isSlotSelectable(slot));
      const [first] = intent.slots;
      if (first.service !== selection.service) selection.setService(first.service);
      selection.goToDate(toBusinessDate(first.startsAt));
      cart.restoreSlots(found);

      if (found.length === 0) {
        showSnackbar({ tone: "warning", title: "Esos horarios ya no están disponibles. Elegí de nuevo." });
      } else if (found.length < intent.slots.length) {
        showSnackbar({
          tone: "warning",
          title: `Recuperamos ${found.length} de ${intent.slots.length} turnos — el resto ya no está disponible.`,
        });
      } else {
        showSnackbar({ tone: "info", title: "Recuperamos tu selección anterior — confirmala cuando quieras." });
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selection.lastBookableDate, userId]);

  if (selection.error) {
    return (
      <p role="alert" className="text-sm text-danger">
        No pudimos cargar la disponibilidad. Probá de nuevo más tarde.
      </p>
    );
  }

  if (selection.loading) {
    return <p className="text-sm text-muted">Cargando disponibilidad…</p>;
  }

  async function confirmForClient() {
    const outcome = await cart.confirm((batch) => createBookings(batch.map((slot) => slot.id)));
    if (outcome.kind === "checkout") {
      const { slot } = outcome;
      router.push(bookingCheckoutHref({ service: slot.service, slotId: slot.id, startsAt: slot.startsAt }));
    }
  }

  const viewProps = {
    service: selection.service,
    services: SERVICE_OPTIONS,
    onChangeService: selection.setService,
    weekLabel: selection.weekLabel,
    atFirstWeek: selection.atFirstWeek,
    atLastWeek: selection.atLastWeek,
    onPrevWeek: selection.prevWeek,
    onNextWeek: selection.nextWeek,
    days: selection.days,
    dayIndex: selection.dayIndex,
    onSelectDay: selection.selectDay,
    groups: selection.groups,
    rows: selection.rows,
    cart,
    onToggleSlot: cart.toggleSlot,
    renderSlotExtra,
    onConfirm: () => (onConfirm ? onConfirm(cart) : void confirmForClient()),
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="hidden lg:block" data-testid="booking-grid-desktop">
        <BookingGridDesktop {...viewProps} />
      </div>
      <div className="lg:hidden" data-testid="booking-grid-mobile">
        <BookingGridMobile {...viewProps} />
      </div>
      {/* Below the grid: what you already have is context for the pick, not a header
          above it. On mobile the floating cart overlays the bottom of the page, so this
          last block carries the clearance the grid used to (one more line per service). */}
      <div className={cn("lg:pb-0", cart.count === 0 ? "pb-0" : cart.groups.length < 3 ? "pb-32" : "pb-40")}>
        {showPlanBanner ? <BookingPlanBanner model={subscriptionsModel} service={selection.service} /> : null}
      </div>
    </div>
  );
}
