"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

// Deep import, not the feature's index.ts: that barrel also re-exports
// AvatarSlot/RedirectIfSignedIn, which pull in next/headers and would break
// this client component's bundle if imported through it.
import { useSnackbar } from "@/components/ui/snackbar";
import { signOut } from "@/features/auth/sign-out";
// Deep import for the same reason: the checkout index also exports server components.
import { bookingCheckoutHref } from "@/features/checkout/checkout-routes";
import { BookingPlanBanner } from "@/features/subscriptions/booking-plan-banner";
import { presentSubscriptions } from "@/features/subscriptions/present-subscriptions";
import type { BookableSlot, BookingResponse, ServiceType } from "@/lib/api/types";
import type { AuthenticatedUser } from "@/lib/session";

import { toBookingFailure } from "../booking-error-actions";
import { createBooking } from "../create-booking";
import { getPublicSlots } from "../get-public-slots";
import { clearPendingSlotIntent, readPendingSlotIntentState } from "../pending-slot-intent";
import { SERVICE_OPTIONS } from "../service-options";
import { isPastSlot, isSlotSelectable, toBusinessDate } from "../slots";
import { useSlotSelection } from "../use-slot-selection";
import { PublicBookingDesktop } from "./public-booking-desktop";
import { PublicBookingMobile } from "./public-booking-mobile";
import type { PublicBookingStep } from "./types";
import { useMySubscriptions } from "./use-my-subscriptions";

const DEFAULT_CONFIRM_LABEL = "Confirmar reserva";
const SELECTION_EXPIRED_TITLE = "Tu selección anterior venció. Elegí el horario de nuevo.";
const CHECKOUT_FIRST_SERVICE: ServiceType = "rehab";
const CHECKOUT_FIRST_CONFIRM_LABEL = "Continuar al pago";

function publicSlotLabel(slot: BookableSlot): string {
  if (isPastSlot(slot)) return "";
  return isSlotSelectable(slot) ? "Disponible" : "No disponible";
}

export interface PublicBookingProps {
  service: ServiceType;
  initialUser: AuthenticatedUser | null;
}

export function PublicBooking({ service: initialService, initialUser }: PublicBookingProps) {
  const router = useRouter();
  const [user, setUser] = useState(initialUser);
  const [step, setStep] = useState<PublicBookingStep>("pick");
  const [booking, setBooking] = useState<BookingResponse | null>(null);
  const { showSnackbar } = useSnackbar();
  const [isConfirming, setIsConfirming] = useState(false);

  const selection = useSlotSelection(initialService, {
    fetchSlots: getPublicSlots,
    labelFor: publicSlotLabel,
    onChange: () => {
      setStep("pick");
      setBooking(null);
    },
  });
  const subscriptions = useMySubscriptions(user);
  const subscriptionsModel = subscriptions ? presentSubscriptions(subscriptions) : null;

  // Set once, on mount, to the slot id we're waiting to confirm still exists; cleared once
  // that week's real data has arrived and we've reacted to it (found it, or not).
  const restoreTargetRef = useRef<string | null>(null);

  useEffect(() => {
    const saved = readPendingSlotIntentState(user?.id ?? null);
    // It timed out while the user was away paying: say so rather than quietly dropping it.
    // Neither the purchase nor a paid booking is affected by this expiry.
    if (saved.status === "expired") {
      showSnackbar({ tone: "warning", title: SELECTION_EXPIRED_TITLE });
      return;
    }
    if (saved.status !== "ready") return;
    const intent = saved.intent;
    if (intent.surface !== "reservar" || intent.slots.length === 0) return;
    clearPendingSlotIntent();
    const [item] = intent.slots;
    restoreTargetRef.current = item.slotId;
    if (item.service !== selection.service) selection.setService(item.service);
    // Sets slotId right away too — `selectedSlot` below resolves on its own once this
    // week's fetch (triggered by the service/week change above) actually completes.
    selection.goToDate(toBusinessDate(item.startsAt), item.slotId);
    // Runs once, right after mount, before the user has done anything.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const targetId = restoreTargetRef.current;
    if (!targetId || selection.selectedSlotId !== targetId) return;
    // Same reason as the grid's restore: before the target week's data is in hand, a
    // missing slot means "not loaded yet", not "taken".
    if (!selection.isShowingLoadedWeek) return;
    restoreTargetRef.current = null;
    if (selection.selectedSlot) {
      showSnackbar({ tone: "info", title: "Recuperamos el turno que habías elegido." });
    } else {
      selection.clearSlot();
      showSnackbar({ tone: "warning", title: "Ese horario ya no está disponible. Elegí otro." });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selection.isShowingLoadedWeek, selection.selectedSlotId, selection.selectedSlot]);

  // No busy state here: Next keeps this route alive (hidden) while the checkout is
  // open, so anything set before navigating is still there when the client comes back.
  function continueToCheckout(slot: BookableSlot) {
    router.push(bookingCheckoutHref({ service: CHECKOUT_FIRST_SERVICE, slotId: slot.id, startsAt: slot.startsAt }));
  }

  async function confirmBooking(slot: BookableSlot) {
    setIsConfirming(true);
    try {
      const result = await createBooking(slot.id);
      setBooking(result);
    } catch (error) {
      const failure = toBookingFailure(error, slot);
      showSnackbar({ tone: "danger", title: failure.message, action: failure.action ?? undefined });
    } finally {
      // Either way the real availability/alreadyBooked state just changed
      // (a slot filled up, or this visitor now holds one) — refresh so
      // picking again (e.g. after "Reservar otro horario") shows the truth.
      selection.refresh();
      setIsConfirming(false);
    }
  }

  function confirmSlot(slot: BookableSlot) {
    if (selection.service === CHECKOUT_FIRST_SERVICE) {
      continueToCheckout(slot);
      return;
    }
    confirmBooking(slot);
  }

  function handleConfirmClick() {
    if (!selection.selectedSlot) return;
    if (user) {
      confirmSlot(selection.selectedSlot);
      return;
    }
    setStep("auth");
  }

  function handleAuthenticated(authenticatedUser: AuthenticatedUser) {
    setUser(authenticatedUser);
    setStep("pick");
    router.refresh();
    if (selection.selectedSlot) confirmSlot(selection.selectedSlot);
  }

  function handleCancelAuth() {
    setStep("pick");
    setIsConfirming(false);
  }

  function handleSignOut() {
    void signOut();
    setUser(null);
    router.refresh();
  }

  function handleReset() {
    setBooking(null);
    setStep("pick");
    selection.clearSlot();
  }

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

  const viewProps = {
    service: selection.service,
    services: SERVICE_OPTIONS,
    onChangeService: selection.setService,
    weekLabel: selection.weekLabel,
    atFirstWeek: selection.atFirstWeek,
    atLastWeek: selection.atLastWeek,
    onPrevWeek: selection.prevWeek,
    onNextWeek: selection.nextWeek,
    onGoToday: selection.goToday,
    isToday: selection.isToday,
    days: selection.days,
    dayIndex: selection.dayIndex,
    onSelectDay: selection.selectDay,
    groups: selection.groups,
    rows: selection.rows,
    selectedSlot: selection.selectedSlot,
    onSelectSlot: selection.selectSlot,
    step,
    user,
    onConfirmClick: handleConfirmClick,
    onAuthenticated: handleAuthenticated,
    onCancelAuth: handleCancelAuth,
    onSignOut: handleSignOut,
    isConfirming,
    confirmLabel: selection.service === CHECKOUT_FIRST_SERVICE ? CHECKOUT_FIRST_CONFIRM_LABEL : DEFAULT_CONFIRM_LABEL,
    booking,
    onReset: handleReset,
  };

  return (
    <div className="flex flex-col gap-6">
      <BookingPlanBanner model={subscriptionsModel} service={selection.service} />
      <div className="hidden lg:block" data-testid="public-booking-desktop">
        <PublicBookingDesktop {...viewProps} />
      </div>
      <div className="lg:hidden" data-testid="public-booking-mobile">
        <PublicBookingMobile {...viewProps} />
      </div>
    </div>
  );
}
