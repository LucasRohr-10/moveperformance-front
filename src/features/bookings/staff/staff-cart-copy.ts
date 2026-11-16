import type { BookableSlot, RehabKind, ServiceType, SlotEligibility, SlotEligibilityDto } from "@/lib/api/types";

import { isoWeekday, formatSlotTime, toBusinessDate } from "../slots";
import type { CartState, CoverageLine } from "../cart-policy";

const WEEKDAYS_SHORT = ["lun", "mar", "mié", "jue", "vie", "sáb", "dom"];
const SERVICE_NAMES: Record<ServiceType, string> = {
  performance: "Performance",
  rehab: "Rehab",
  recovery: "Recovery",
};
const REHAB_KIND_NAMES: Record<RehabKind, string> = { evaluation: "Evaluación", followup: "Seguimiento" };

const CHARGED_OFFLINE = "Se cobra por fuera";

// The preview verdict (with its slot id) and the one a slot carries share what the Staff wording reads.
type Verdict = SlotEligibility | SlotEligibilityDto;

function isChargedOffline(eligibility: Verdict): boolean {
  return eligibility.covered === false || eligibility.reason === "NOT_APPLICABLE";
}

/** Which of the client's plans covers the slot, or that it is charged outside. Null without a verdict. */
export function staffCoverage(slot: BookableSlot, eligibility: Verdict | null): CoverageLine | null {
  if (!eligibility) return null;
  if (eligibility.covered === true) {
    return { text: slot.service === "recovery" ? "Usa 1 sesión del paquete" : "Incluido en su plan", tone: "ok" };
  }
  return isChargedOffline(eligibility) ? { text: CHARGED_OFFLINE, tone: "offline" } : null;
}

/**
 * The slots the preview does not cover, so they are charged outside the platform. A slot with
 * no verdict (the preview failed) counts: if the plan covers it the backend will not charge it,
 * but the Staff has to be told it might be.
 */
export function chargedOfflineSlots(state: CartState): BookableSlot[] {
  return state.batch.filter((slot) => state.eligibilityOf(slot.id)?.covered !== true);
}

export function offlineOverflow(offlineCount: number, room: number | null): number {
  if (room === null) return 0;
  return Math.max(0, offlineCount - room);
}

export function offlineOverflowText(room: number, overflow: number): string {
  if (room <= 0) {
    return "Este cliente llegó al máximo de cosas sin pagar de Configuración. Registrá un pago o quitá los turnos que se cobran por fuera.";
  }
  const places = room === 1 ? "Le queda 1 lugar" : `Le quedan ${room} lugares`;
  const remove = overflow === 1 ? "Quitá 1 turno que se cobra" : `Quitá ${overflow} turnos que se cobran`;
  return `${places} para reservas por fuera. ${remove} por fuera.`;
}

// "Rehab · mar 03/11 08:00 · Evaluación"; the kind only exists for Rehab.
export function offlineSlotTitle(slot: BookableSlot, rehabKind: RehabKind | null): string {
  const date = toBusinessDate(slot.startsAt);
  const [, month, day] = date.split("-");
  const when = `${WEEKDAYS_SHORT[isoWeekday(date) - 1]} ${day}/${month} ${formatSlotTime(slot.startsAt)}`;
  const base = `${SERVICE_NAMES[slot.service]} · ${when}`;
  return slot.service === "rehab" && rehabKind ? `${base} · ${REHAB_KIND_NAMES[rehabKind]}` : base;
}
