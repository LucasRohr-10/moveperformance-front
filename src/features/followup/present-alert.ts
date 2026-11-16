import type { StatusBadgeProps } from "@/components/ui/status-badge";
import { daysBetween } from "@/features/bookings/slots";
import { businessDateOf } from "@/features/checkout/business-time";
import { formatBusinessDate } from "@/features/subscriptions/present-subscriptions";
import { ALERT_TYPES, type AlertDto, type AlertType } from "@/lib/api/types";

import { formatFrequency } from "./format-frequency";
import { PAUSE_LABELS } from "./followup-labels";

export type AlertAction = "contact" | "handle" | "reason" | "history";

export type AlertHeadline =
  | { kind: "fact"; title: string; detail: string | null }
  | { kind: "quote"; text: string; detail: string };

export interface AlertRowModel {
  name: string;
  initials: string;
  subtitle: string;
  badge: StatusBadgeProps;
  headline: AlertHeadline;
  lastAttendance: string | null;
  actions: AlertAction[];
}

interface AlertRule {
  badge: (alert: AlertDto) => StatusBadgeProps;
  subtitle: (alert: AlertDto) => string;
  headline: (alert: AlertDto, today: string) => AlertHeadline;
  actions: AlertAction[];
}

// endsOn, lastAttendanceOn and recontactOn are business dates: the front only splits the string.
function dayAndMonth(date: string): string {
  const [, month, day] = date.split("-");
  return `${day}/${month}`;
}

const planLabel = ({ planName }: AlertDto): string => (planName === null ? "Sin plan" : `Plan ${planName}`);

function planSubtitle(alert: AlertDto): string {
  const { contactsCount } = alert;
  if (contactsCount === 0) return planLabel(alert);
  const contacts = contactsCount === 1 ? "1 contacto previo" : `${contactsCount} contactos previos`;
  return `${planLabel(alert)} · ${contacts}`;
}

function recontactSubtitle(alert: AlertDto): string {
  return alert.pause === null ? planSubtitle(alert) : PAUSE_LABELS[alert.pause.reason];
}

const fact = (title: string, detail: string | null = null): AlertHeadline => ({ kind: "fact", title, detail });

function planOf({ planName }: AlertDto): string {
  return planName === null ? "El plan" : `El plan ${planName}`;
}

function expiringHeadline(alert: AlertDto, today: string): AlertHeadline {
  const { endsOn } = alert;
  if (endsOn === null) return fact("Plan por vencer");
  const days = daysBetween(today, endsOn);
  const title = days <= 0 ? "Vence hoy" : days === 1 ? "Vence mañana" : `Vence en ${days} días`;
  return fact(title, `${planOf(alert)} vence el ${formatBusinessDate(endsOn)}.`);
}

function expiredHeadline(alert: AlertDto, today: string): AlertHeadline {
  const { endsOn } = alert;
  if (endsOn === null) return fact("Plan vencido");
  const days = daysBetween(endsOn, today);
  const title = days <= 0 ? "Venció hoy" : days === 1 ? "Venció ayer" : `Venció hace ${days} días`;
  return fact(title, `${planOf(alert)} venció el ${formatBusinessDate(endsOn)} y no se renovó.`);
}

function usualFrequencySentence({ usualFrequencyPerWeek }: AlertDto): string | null {
  if (usualFrequencyPerWeek === null) return null;
  const times = usualFrequencyPerWeek === 1 ? "vez" : "veces";
  return `Venía ${formatFrequency(usualFrequencyPerWeek)} ${times} por semana.`;
}

function withoutAttendingHeadline(alert: AlertDto, today: string): AlertHeadline {
  const { lastAttendanceOn } = alert;
  const usual = usualFrequencySentence(alert);
  if (lastAttendanceOn === null) return fact("Sin asistencias registradas", usual);
  const days = daysBetween(lastAttendanceOn, today);
  const title = days === 1 ? "1 día sin asistir" : `${days} días sin asistir`;
  const last = `Última asistencia el ${dayAndMonth(lastAttendanceOn)}.`;
  return fact(title, usual === null ? last : `${last} ${usual}`);
}

function frequencyDropHeadline({ frequencyPerWeek, usualFrequencyPerWeek }: AlertDto): AlertHeadline {
  if (usualFrequencyPerWeek === null) return fact(`Frecuencia ${formatFrequency(frequencyPerWeek)} por semana`);
  return fact(
    `Bajó de ${formatFrequency(usualFrequencyPerWeek)} a ${formatFrequency(frequencyPerWeek)} por semana`,
    "Frecuencia de las últimas 4 semanas contra la habitual.",
  );
}

function recontactHeadline({ pause }: AlertDto, today: string): AlertHeadline {
  const detail = pause === null ? null : `${PAUSE_LABELS[pause.reason]} registrada el ${dayAndMonth(businessDateOf(pause.since))}.`;
  const date = pause?.recontactOn ?? null;
  if (date === null) return fact("Re-contactar", detail);
  return fact(date === today ? "Pidió contacto para hoy" : `Pidió contacto para el ${formatBusinessDate(date)}`, detail);
}

function recontactBadge({ pause }: AlertDto): StatusBadgeProps {
  const date = pause?.recontactOn;
  return { label: date ? `Re-contactar el ${formatBusinessDate(date)}` : "Re-contactar", tone: "neutral" };
}

const CHECKIN_DETAIL = "Respondió en el check-in";

function checkinHeadline(text: string | null | undefined, fallback: string): AlertHeadline {
  return text ? { kind: "quote", text: `“${text}”`, detail: CHECKIN_DETAIL } : fact(fallback);
}

const withBadge = (badge: StatusBadgeProps) => (): StatusBadgeProps => badge;

const WITH_REASON: AlertAction[] = ["contact", "handle", "reason", "history"];
const CHECKIN_ACTIONS: AlertAction[] = ["contact", "handle", "history"];

// One rule per alert type, so a new type is one more entry and no `if` to edit.
const ALERT_RULES: Record<AlertType, AlertRule> = {
  [ALERT_TYPES.EXPIRING]: {
    badge: withBadge({ label: "Plan por vencer", tone: "warning" }),
    subtitle: planSubtitle,
    headline: expiringHeadline,
    actions: WITH_REASON,
  },
  [ALERT_TYPES.EXPIRED]: {
    badge: withBadge({ label: "Vencido sin renovación", tone: "danger" }),
    subtitle: planSubtitle,
    headline: expiredHeadline,
    actions: WITH_REASON,
  },
  [ALERT_TYPES.NO_ATTENDANCE]: {
    badge: withBadge({ label: "1 semana sin asistir", tone: "neutral" }),
    subtitle: planSubtitle,
    headline: withoutAttendingHeadline,
    actions: WITH_REASON,
  },
  [ALERT_TYPES.PROLONGED_INACTIVITY]: {
    badge: withBadge({ label: "Inactividad prolongada", tone: "danger" }),
    subtitle: planSubtitle,
    headline: withoutAttendingHeadline,
    actions: WITH_REASON,
  },
  [ALERT_TYPES.FREQUENCY_DROP]: {
    badge: withBadge({ label: "Baja de frecuencia", tone: "warning" }),
    subtitle: planSubtitle,
    headline: frequencyDropHeadline,
    actions: WITH_REASON,
  },
  [ALERT_TYPES.RECONTACT]: {
    badge: recontactBadge,
    subtitle: recontactSubtitle,
    headline: recontactHeadline,
    actions: ["contact", "handle", "history"],
  },
  [ALERT_TYPES.CHECKIN_PAIN]: {
    badge: withBadge({ label: "Molestia reportada", tone: "warning" }),
    subtitle: planSubtitle,
    headline: ({ checkin }) => checkinHeadline(checkin?.painDetail, "Reportó una molestia en el check-in"),
    actions: CHECKIN_ACTIONS,
  },
  [ALERT_TYPES.CHECKIN_GOALS]: {
    badge: withBadge({ label: "Cambio de objetivos", tone: "warning" }),
    subtitle: planSubtitle,
    headline: ({ checkin }) => checkinHeadline(checkin?.goalsDetail, "Quiere ajustar sus objetivos"),
    actions: CHECKIN_ACTIONS,
  },
};

export function presentAlert(alert: AlertDto, today: string): AlertRowModel {
  const rule = ALERT_RULES[alert.type];
  return {
    name: alert.client.name,
    initials: alert.client.initials,
    subtitle: rule.subtitle(alert),
    badge: rule.badge(alert),
    headline: rule.headline(alert, today),
    lastAttendance: alert.lastAttendanceOn === null ? null : dayAndMonth(alert.lastAttendanceOn),
    actions: [...rule.actions],
  };
}
