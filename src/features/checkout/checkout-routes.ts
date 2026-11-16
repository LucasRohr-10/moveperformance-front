import { ROUTES } from "@/config/constants/routes.constants";
import type { PurchaseKind, PurchaseStatusDto, ServiceType } from "@/lib/api/types";

import { businessDateOf } from "./business-time";

export function planCheckoutHref(planId: string): string {
  return `${ROUTES.CHECKOUT_PLAN}/${encodeURIComponent(planId)}`;
}

export function bookingCheckoutHrefFor(input: { service: ServiceType; date: string; slotId: string }): string {
  const query = new URLSearchParams({ service: input.service, date: input.date, slot: input.slotId });
  return `${ROUTES.CHECKOUT_BOOKING}?${query}`;
}

export function bookingCheckoutHref(input: { service: ServiceType; slotId: string; startsAt: string }): string {
  return bookingCheckoutHrefFor({
    service: input.service,
    date: businessDateOf(input.startsAt),
    slotId: input.slotId,
  });
}

export function reserveHref(service: ServiceType): string {
  return `${ROUTES.RESERVE}?${new URLSearchParams({ service })}`;
}

export function bookingsHref(service: ServiceType): string {
  return `${ROUTES.BOOKINGS}?${new URLSearchParams({ service })}`;
}

export function resultHref(externalReference: string, providerStatus?: "rejected"): string {
  const query = new URLSearchParams({ ref: externalReference });
  if (providerStatus) query.set("status", providerStatus);
  return `${ROUTES.CHECKOUT_RESULT}?${query}`;
}

export function autoDebitResultHref(externalReference: string): string {
  return `${ROUTES.CHECKOUT_RESULT}?${new URLSearchParams({ debito: externalReference })}`;
}

export function autoDebitSimulatorHref(externalReference: string): string {
  return `${ROUTES.CHECKOUT_SIMULATOR}?${new URLSearchParams({ debito: externalReference })}`;
}

const RETRY_HREFS: Record<PurchaseKind, (purchase: Pick<PurchaseStatusDto, "service" | "planId">) => string> = {
  plan: ({ planId }) => planCheckoutHref(planId),
  booking: ({ service }) => reserveHref(service),
};

export function retryHref(purchase: Pick<PurchaseStatusDto, "kind" | "service" | "planId">): string {
  return RETRY_HREFS[purchase.kind](purchase);
}
