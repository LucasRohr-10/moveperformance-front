import type { AuthenticatedUser } from "@/lib/session";
import type { BookableSlot, BookingResponse, ServiceType } from "@/lib/api/types";
import type { DaySummary, SlotGroup, SlotRow } from "../slots";
import type { ServiceOption } from "../types";

export type PublicBookingStep = "pick" | "auth";

export interface PublicBookingViewProps {
  service: ServiceType;
  services: ServiceOption[];
  onChangeService: (service: ServiceType) => void;
  weekLabel: string;
  atFirstWeek: boolean;
  atLastWeek: boolean;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onGoToday: () => void;
  isToday: boolean;
  days: DaySummary[];
  dayIndex: number;
  onSelectDay: (index: number) => void;
  groups: SlotGroup[];
  rows: SlotRow[];
  selectedSlot: BookableSlot | null;
  onSelectSlot: (dayIndex: number, slotId: string) => void;
  step: PublicBookingStep;
  user: AuthenticatedUser | null;
  onConfirmClick: () => void;
  onAuthenticated: (user: AuthenticatedUser) => void;
  onCancelAuth: () => void;
  onSignOut: () => void;
  isConfirming: boolean;
  confirmLabel: string;
  booking: BookingResponse | null;
  onReset: () => void;
}
