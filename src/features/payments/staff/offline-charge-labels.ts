import { ROUTES } from "@/config/constants/routes.constants";
import { BUSINESS_TZ, isoWeekday, formatSlotTime, toBusinessDate } from "@/features/bookings/slots";
import { ApiError } from "@/lib/api/errors";
import type { OfflineChargeDto, OfflineChargeStatus, PaymentMethod, ServiceType } from "@/lib/api/types";
import { formatExactPrice } from "@/lib/money";

import { SERVICE_LABELS } from "./staff-payments-labels";

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  mercado_pago: "Mercado Pago",
  cash: "Efectivo",
  transfer: "Transferencia",
  undecided: "A definir",
};

export const OFFLINE_CHARGE_STATUS: Record<
  OfflineChargeStatus,
  { label: string; tone: "success" | "warning" | "neutral" }
> = {
  pending: { label: "Por cobrar", tone: "warning" },
  approved: { label: "Pagado", tone: "success" },
  cancelled: { label: "Cancelado, no se cobró", tone: "neutral" },
  waived: { label: "No se cobra", tone: "neutral" },
};

export const OFFLINE_ERROR_CODES = {
  LIMIT_REACHED: "OFFLINE_CHARGE_LIMIT_REACHED",
  NOT_FOUND: "OFFLINE_CHARGE_NOT_FOUND",
  NOT_OPEN: "OFFLINE_CHARGE_NOT_OPEN",
  SLOT_NOT_STARTED: "OFFLINE_CHARGE_SLOT_NOT_STARTED",
  DATE_IN_FUTURE: "OFFLINE_PAYMENT_DATE_IN_FUTURE",
  DATE_TOO_OLD: "OFFLINE_PAYMENT_DATE_TOO_OLD",
  UPLOAD_UNAVAILABLE: "RECEIPT_UPLOAD_UNAVAILABLE",
  TOO_LARGE: "RECEIPT_TOO_LARGE",
  TYPE_NOT_ALLOWED: "RECEIPT_TYPE_NOT_ALLOWED",
  STORAGE_ERROR: "FILE_STORAGE_ERROR",
} as const;

// Set by apiFetchClient's body parser when the response was not JSON (a proxy, a timeout).
export const NON_JSON_CODE = "UNKNOWN";
const WEEKDAYS_SHORT = ["lun", "mar", "mié", "jue", "vie", "sáb", "dom"];

export function offlineErrorCode(error: unknown): string | null {
  return error instanceof ApiError ? error.body.code : null;
}

/** The backend's message when it sent one; otherwise `fallback`. */
export function offlineErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof ApiError) || error.body.code === NON_JSON_CODE) return fallback;
  return error.body.message || fallback;
}

/** "Recovery · vie 6/11, 10:00"; without a booking, "Recovery · <item>". */
export function offlineChargeTitle(charge: Pick<OfflineChargeDto, "service" | "booking" | "itemName">): string {
  const service = SERVICE_LABELS[charge.service];
  if (!charge.booking) return `${service} · ${charge.itemName}`;
  const date = toBusinessDate(charge.booking.startsAt);
  const [, month, day] = date.split("-");
  const weekday = WEEKDAYS_SHORT[isoWeekday(date) - 1];
  return `${service} · ${weekday} ${Number(day)}/${Number(month)}, ${formatSlotTime(charge.booking.startsAt)}`;
}

/** A Performance plan is a "plan"; what a client buys for Recovery is a "paquete". */
export const planNoun = (service: ServiceType): "plan" | "paquete" => (service === "recovery" ? "paquete" : "plan");

/** "el plan Mensual" / "el paquete 4 sesiones": the pack's name already starts with "Paquete". */
export function planPhrase(service: ServiceType, itemName: string): string {
  return service === "recovery" ? `el ${itemName.charAt(0).toLowerCase()}${itemName.slice(1)}` : `el plan ${itemName}`;
}

/** The "Qué" of a row: the plan with its service, a turn of that plan by its service alone, anything else by its name. */
export function offlineChargeWhat(
  charge: Pick<OfflineChargeDto, "kind" | "paysWith" | "service" | "itemName">,
): string {
  const service = SERVICE_LABELS[charge.service];
  if (charge.paysWith) return `Turno ${service}`;
  const name = charge.kind === "plan" && planNoun(charge.service) === "plan" ? `Plan ${charge.itemName}` : charge.itemName;
  return `${name} · ${service}`;
}

/** The "Cuándo" of a row: since when an unpaid plan runs, or the day and time of the turn. Null when it has neither. */
export function offlineChargeWhen(
  charge: Pick<OfflineChargeDto, "kind" | "paysWith" | "planStartsOn" | "booking">,
): string | null {
  if (charge.kind === "plan" && !charge.paysWith && charge.planStartsOn) {
    const [, month, day] = charge.planStartsOn.split("-");
    return `Desde ${day}/${month}`;
  }
  if (!charge.booking) return null;
  const date = toBusinessDate(charge.booking.startsAt);
  const [, month, day] = date.split("-");
  const weekday = WEEKDAYS_SHORT[isoWeekday(date) - 1];
  return `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)} ${Number(day)}/${Number(month)} ${formatSlotTime(charge.booking.startsAt)}`;
}

/** Under the "Qué" of a row: what a turn of an unpaid plan is paid with. */
export function offlineChargeSubtitle(charge: Pick<OfflineChargeDto, "paysWith" | "service">): string | null {
  return charge.paysWith ? `Se paga con ${planPhrase(charge.service, charge.paysWith.itemName)}` : null;
}

/** A plan and each turn booked with it share the plan's charge id, so the booking tells their rows apart. */
export function offlineChargeRowKey(charge: Pick<OfflineChargeDto, "id" | "bookingId">): string {
  return `${charge.id}:${charge.bookingId ?? "plan"}`;
}

export function offlineChargeHref(id: string): string {
  return `${ROUTES.STAFF_PAYMENTS}/offline-charges/${encodeURIComponent(id)}`;
}

/**
 * Pagos > Por cobrar, for one client when `clientId` is given, only the overdue ones with `overdue` and only today's
 * with `today`. They are disjoint, so asking for both gives today's.
 */
export function toCollectHref(clientId?: string, options: { overdue?: boolean; today?: boolean } = {}): string {
  const base = `${ROUTES.STAFF_PAYMENTS}?view=to-collect`;
  const withClient = clientId ? `${base}&clientId=${encodeURIComponent(clientId)}` : base;
  if (options.today) return `${withClient}&dia=hoy`;
  return options.overdue ? `${withClient}&atrasados=true` : withClient;
}

const DATE_TIME_FORMAT = new Intl.DateTimeFormat("es-UY", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: BUSINESS_TZ,
});

/** "02/11 09:05" in Montevideo time. */
export function formatChargeDateTime(iso: string): string {
  const parts = Object.fromEntries(DATE_TIME_FORMAT.formatToParts(new Date(iso)).map((part) => [part.type, part.value]));
  const pad = (value: string) => value.padStart(2, "0");
  return `${pad(parts.day)}/${pad(parts.month)} ${pad(parts.hour)}:${pad(parts.minute)}`;
}

/** "02/11/2026" from a YYYY-MM-DD business date. */
export function formatPaidOn(date: string): string {
  const [year, month, day] = date.split("-");
  return `${day}/${month}/${year}`;
}

// A charge can have no price yet: a dash, never "$ 0".
export function formatOfflineAmount(amount: number | null): string {
  return amount === null ? "—" : formatExactPrice(amount);
}

/**
 * What a client owes, in words: each charge once (a plan and the turns booked with it share the plan's charge), told as
 * "el plan" or "N planes" and "N turnos". Null when there is nothing to pay.
 */
export function owedSummary(charges: Array<Pick<OfflineChargeDto, "id" | "kind" | "service">>): string | null {
  const byId = new Map(charges.map(({ id, kind, service }) => [id, kind === "plan" ? planNoun(service) : "turno"] as const));
  const nouns = [...byId.values()];
  const count = (noun: string) => nouns.filter((candidate) => candidate === noun).length;
  const parts = [
    ["plan", "el plan", "planes"],
    ["paquete", "el paquete", "paquetes"],
    ["turno", "1 turno", "turnos"],
  ].flatMap(([noun, one, many]) => {
    const total = count(noun);
    if (total === 0) return [];
    return [total === 1 ? one : `${total} ${many}`];
  });
  if (parts.length === 0) return null;
  const last = parts.pop() as string;
  return `Falta pagar ${parts.length === 0 ? last : `${parts.join(", ")} y ${last}`}`;
}
