import type { ReactNode } from "react";

import type { BookableSlot, ServiceType } from "@/lib/api/types";
import type { DaySummary, SlotGroup, SlotRow } from "./slots";
import type { BookingCart } from "./use-booking-cart";

export interface ServiceOption {
  value: ServiceType;
  label: string;
  title: string;
}

const SERVICE_TYPES: ServiceType[] = ["performance", "rehab", "recovery"];

export function parseServiceType(value: string | undefined): ServiceType | undefined {
  return SERVICE_TYPES.find((service) => service === value);
}

export interface BookingGridViewProps {
  service: ServiceType;
  services: ServiceOption[];
  onChangeService: (service: ServiceType) => void;
  weekLabel: string;
  atFirstWeek: boolean;
  atLastWeek: boolean;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  days: DaySummary[];
  dayIndex: number;
  onSelectDay: (index: number) => void;
  groups: SlotGroup[];
  rows: SlotRow[];
  cart: BookingCart;
  onToggleSlot: (slot: BookableSlot) => void;
  onConfirm: () => void;
  renderSlotExtra?: (slot: BookableSlot) => ReactNode;
}
