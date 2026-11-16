import { apiFetchClient, parseJsonOrThrow } from "@/lib/api/client";
import type {
  BookableSlot,
  MySubscriptionsDto,
  OfflineChargeAllowanceDto,
  ServiceType,
  StaffBookingsBatchDto,
  StaffBookingsInput,
  StaffSlotEligibilityDto,
} from "@/lib/api/types";

const JSON_HEADERS = { "Content-Type": "application/json" };

function clientPath(clientId: string): string {
  return `/api/v1/staff/clients/${encodeURIComponent(clientId)}`;
}

export async function getClientSubscriptions(clientId: string): Promise<MySubscriptionsDto> {
  const response = await apiFetchClient(`${clientPath(clientId)}/subscriptions`);
  return parseJsonOrThrow<MySubscriptionsDto>(response);
}

export async function getClientSlots(
  clientId: string,
  service: ServiceType,
  date: string,
): Promise<BookableSlot[]> {
  const query = new URLSearchParams({ service, date });
  const response = await apiFetchClient(`${clientPath(clientId)}/slots?${query}`);
  return parseJsonOrThrow<BookableSlot[]>(response);
}

/** Non-mutating: previews what covers each slot for this client, in the order sent to `createClientBookings`. */
export async function getClientBatchEligibility(
  clientId: string,
  timeSlotIds: string[],
): Promise<StaffSlotEligibilityDto[]> {
  const response = await apiFetchClient(`${clientPath(clientId)}/batch-eligibility`, {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify({ timeSlotIds }),
  });
  return parseJsonOrThrow<StaffSlotEligibilityDto[]>(response);
}

/** The body never has an amount: the backend takes the price from Configuración. */
export async function createClientBookings(
  clientId: string,
  input: StaffBookingsInput,
): Promise<StaffBookingsBatchDto> {
  const response = await apiFetchClient(`${clientPath(clientId)}/bookings`, {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify(input),
  });
  return parseJsonOrThrow<StaffBookingsBatchDto>(response);
}

export async function getOfflineChargeAllowance(clientId: string): Promise<OfflineChargeAllowanceDto> {
  const response = await apiFetchClient(`${clientPath(clientId)}/offline-charge-allowance`);
  return parseJsonOrThrow<OfflineChargeAllowanceDto>(response);
}
