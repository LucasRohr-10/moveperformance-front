import { ROUTES } from "@/config/constants/routes.constants";
import {
  ALERT_TYPES,
  type AlertType,
  type ContactChannel,
  type ContactOutcome,
  type InactivityReason,
} from "@/lib/api/types";

// One entry per alert type, so a new type is one more line here and one more rule in `present-alert`.
export const ALERT_LABELS: Record<AlertType, string> = {
  [ALERT_TYPES.EXPIRING]: "Por vencer",
  [ALERT_TYPES.EXPIRED]: "Vencidos sin renovar",
  [ALERT_TYPES.NO_ATTENDANCE]: "1 semana sin asistir",
  [ALERT_TYPES.PROLONGED_INACTIVITY]: "Inactividad prolongada",
  [ALERT_TYPES.FREQUENCY_DROP]: "Baja de frecuencia",
  [ALERT_TYPES.RECONTACT]: "Re-contactar",
  [ALERT_TYPES.CHECKIN_PAIN]: "Molestia reportada",
  [ALERT_TYPES.CHECKIN_GOALS]: "Cambio de objetivos",
};

// The order of the filter chips: grouped by urgency (danger → warning → neutral).
export const ALERT_ORDER: readonly AlertType[] = [
  ALERT_TYPES.EXPIRED,
  ALERT_TYPES.PROLONGED_INACTIVITY,
  ALERT_TYPES.EXPIRING,
  ALERT_TYPES.FREQUENCY_DROP,
  ALERT_TYPES.CHECKIN_PAIN,
  ALERT_TYPES.CHECKIN_GOALS,
  ALERT_TYPES.NO_ATTENDANCE,
  ALERT_TYPES.RECONTACT,
];

// Seguimiento filtered to the clients at risk, the page the dashboard's "Clientes en riesgo" tile opens.
export function followUpRiskHref(): string {
  return `${ROUTES.STAFF_FOLLOW_UP}?riesgo=true`;
}

export function isAlertType(value: string | undefined): value is AlertType {
  return value !== undefined && ALERT_ORDER.some((type) => type === value);
}

// The severity each type's badge renders as in `present-alert.ts` — kept here too
// so a read-only summary (e.g. the dashboard) can color a count without building
// a full `AlertRowModel`. Keep in sync with `present-alert.ts` if a type's tone changes.
export const ALERT_TONE: Record<AlertType, "warning" | "danger" | "neutral"> = {
  [ALERT_TYPES.EXPIRING]: "warning",
  [ALERT_TYPES.EXPIRED]: "danger",
  [ALERT_TYPES.NO_ATTENDANCE]: "neutral",
  [ALERT_TYPES.PROLONGED_INACTIVITY]: "danger",
  [ALERT_TYPES.FREQUENCY_DROP]: "warning",
  [ALERT_TYPES.RECONTACT]: "neutral",
  [ALERT_TYPES.CHECKIN_PAIN]: "warning",
  [ALERT_TYPES.CHECKIN_GOALS]: "warning",
};

export const CHANNEL_LABELS: Record<ContactChannel, string> = {
  phone: "Teléfono",
  whatsapp: "WhatsApp",
  email: "Email",
  in_person: "En persona",
};

export const OUTCOME_LABELS: Record<ContactOutcome, string> = {
  reached: "Habló con la persona",
  no_answer: "No respondió",
  left_message: "Dejé un mensaje",
};

// What staff pick in the form.
export const REASON_LABELS: Record<InactivityReason, string> = {
  injury: "Lesión",
  vacation: "Vacaciones",
  temporary_pause: "Pausa temporal",
  no_time: "Falta de tiempo",
  moving: "Mudanza",
  return_later: "Quiere volver más adelante",
};

// What the alert and the history say about a pause that was already registered.
export const PAUSE_LABELS: Record<InactivityReason, string> = {
  injury: "Pausa por lesión",
  vacation: "Pausa por vacaciones",
  temporary_pause: "Pausa temporal",
  no_time: "Pausa por falta de tiempo",
  moving: "Pausa por mudanza",
  return_later: "Quiere volver más adelante",
};
