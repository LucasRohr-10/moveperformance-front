import { getPlans } from "@/features/plans";
import { parseJsonOrThrow } from "@/lib/api/client";
import { apiFetchServer } from "@/lib/api/server";
import type { BookableSlot, OfflineOptionsDto, PlanDto, ServiceType } from "@/lib/api/types";

import { pickBookingPlan } from "./present-checkout";

const BAD_REQUEST = 400;

export async function getCheckoutPlan(planId: string): Promise<PlanDto | null> {
  const plans = await getPlans();
  return plans.find((plan) => plan.id === planId) ?? null;
}

export async function getBookingPlan(service: ServiceType): Promise<PlanDto | null> {
  return pickBookingPlan(await getPlans(service), service);
}

// A malformed date comes back as 400: the link is wrong, so the slot is not there.
export async function getCheckoutSlot(input: {
  service: ServiceType;
  date: string;
  slotId: string;
}): Promise<BookableSlot | null> {
  const query = new URLSearchParams({ service: input.service, date: input.date });
  const response = await apiFetchServer(`/api/v1/bookings/slots?${query}`);
  if (response.status === BAD_REQUEST) return null;

  const slots = await parseJsonOrThrow<BookableSlot[]>(response);
  return slots.find((slot) => slot.id === input.slotId) ?? null;
}

// Without the options the screen only offers Mercado Pago: the API still decides what is allowed.
export async function getOfflineOptions(): Promise<OfflineOptionsDto | null> {
  try {
    return await parseJsonOrThrow<OfflineOptionsDto>(await apiFetchServer("/api/v1/checkout/offline-options"));
  } catch {
    return null;
  }
}
