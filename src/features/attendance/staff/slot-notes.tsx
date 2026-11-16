import { StatusBadge } from "@/components/ui/status-badge";
import type { DailySlot } from "@/lib/api/types";
import { cn } from "@/lib/cn";

import { coversSomeone } from "./schedule-model";

/**
 * What the design has no visual for but staff still need to see on a slot:
 * cancelled, individual, covered by someone else, blocked by Google Calendar.
 */
export function SlotNotes({ slot, className }: { slot: DailySlot; className?: string }) {
  const hasNotes = slot.cancelledAt || coversSomeone(slot) || slot.isIndividual || slot.calendarBlockedAt;
  if (!hasNotes) return null;

  return (
    <span className={cn("flex flex-wrap gap-1", className)}>
      {slot.cancelledAt ? (
        <StatusBadge label={slot.cancelReason ? `Cancelado · ${slot.cancelReason}` : "Cancelado"} tone="danger" />
      ) : null}
      {coversSomeone(slot) ? <StatusBadge label={`Cubre a ${slot.templateProfessionalName}`} tone="info" /> : null}
      {slot.isIndividual ? <StatusBadge label="Individual" tone="neutral" /> : null}
      {slot.calendarBlockedAt ? <StatusBadge label="Bloqueado por Google Calendar" tone="warning" /> : null}
    </span>
  );
}
