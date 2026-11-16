import { apiFetchClient, parseJsonOrThrow } from "@/lib/api/client";
import type { BookableSlot, ServiceType } from "@/lib/api/types";

export async function getBookableSlots(service: ServiceType, date: string): Promise<BookableSlot[]> {
  const query = new URLSearchParams({ service, date });
  const response = await apiFetchClient(`/api/v1/bookings/slots?${query}`);
  return parseJsonOrThrow<BookableSlot[]>(response);
}
