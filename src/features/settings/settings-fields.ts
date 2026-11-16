import type { SettingsValues } from "@/lib/api/types";

export type SettingKey = keyof SettingsValues;
// "amount" is money that may be left empty (no price); "optionalInteger" is a whole number that may be left empty.
export type SettingKind = "integer" | "decimal" | "amount" | "optionalInteger" | "boolean" | "text";
export type SettingSection = "bookings" | "followup" | "offlinePrices" | "offlinePayments";

// What the form reads from and sends to the API: a number, a yes/no, a text, or null for a value left empty.
export type SettingValue = number | boolean | string | null;
export type SettingsPatch = Partial<Record<SettingKey, SettingValue>>;

export interface SettingField {
  label: string;
  // Left out when the section's own description already says it.
  description?: string;
  // Null when the value has no unit (a proportion).
  unit: string | null;
  kind: SettingKind;
  // Inclusive limits of a whole number; the same ones the API enforces.
  range?: { min: number; max: number };
  section: SettingSection;
  // The field only shows while this yes/no setting is on; its value is kept when it is off.
  dependsOn?: SettingKey;
  // On a yes/no setting: the heading of the block that holds it with the fields that depend on it.
  group?: string;
}

export interface SettingSectionMeta {
  title: string;
  description: string;
}

// The sections of the form, in the order it shows them.
export const SETTING_SECTIONS: Record<SettingSection, SettingSectionMeta> = {
  bookings: {
    title: "Reservas y pagos",
    description: "Qué pueden hacer los clientes al reservar.",
  },
  followup: {
    title: "Seguimiento",
    description: "Cuándo se generan alertas sobre clientes.",
  },
  offlinePrices: {
    title: "Precios para reservar por fuera",
    description:
      "Es el precio que se cobra cuando Staff reserva un turno por fuera. Vacío = sin precio. No cambia lo que se cobra con Mercado Pago.",
  },
  offlinePayments: {
    title: "Pagos en efectivo o transferencia",
    description: "Vale para lo que compra el cliente y para lo que reserva Staff por fuera.",
  },
};

// One entry per setting, in the order the form shows them. Typing it as a Record
// makes the compiler point here when the API adds a setting to SettingsValues.
export const SETTING_FIELDS: Record<SettingKey, SettingField> = {
  cancelLimitHours: {
    label: "Límite para cancelar",
    description: "Horas antes del turno hasta las que se puede cancelar una reserva.",
    unit: "horas",
    kind: "integer",
    section: "bookings",
  },
  bookingWindowDays: {
    label: "Reservas con anticipación",
    description: "Cuántos días hacia adelante se puede reservar.",
    unit: "días",
    kind: "integer",
    section: "bookings",
  },
  pendingPaymentMinutes: {
    label: "Tiempo para pagar una reserva",
    description: "Minutos que se guarda el lugar mientras la persona paga.",
    unit: "minutos",
    kind: "integer",
    section: "bookings",
  },
  expiringSoonDays: {
    label: 'Días para "por vencer"',
    description: "Cuántos días antes del vencimiento de un plan se avisa que está por vencer.",
    unit: "días",
    kind: "integer",
    section: "followup",
  },
  noAttendanceDays: {
    label: "Días sin asistir",
    description: "Cuántos días sin asistir hacen falta para avisar que un cliente dejó de venir.",
    unit: "días",
    kind: "integer",
    section: "followup",
  },
  prolongedInactivityDays: {
    label: "Días de inactividad prolongada",
    description: "Cuántos días sin asistir se consideran una inactividad prolongada. Tiene que ser mayor que los días sin asistir.",
    unit: "días",
    kind: "integer",
    section: "followup",
  },
  frequencyDropRatio: {
    label: "Ratio de baja de frecuencia",
    description: "Avisa cuando la frecuencia de las últimas dos semanas baja de esta proporción de la habitual (ej. 0,5 = la mitad).",
    unit: null,
    kind: "decimal",
    section: "followup",
  },
  renewalGraceDays: {
    label: "Gracia para renovar",
    description: "Cuántos días después de vencer un plan se espera la renovación antes de contar una baja.",
    unit: "días",
    kind: "integer",
    section: "followup",
  },
  offlinePriceRehabEvaluation: { label: "Evaluación de Rehab", unit: null, kind: "amount", section: "offlinePrices" },
  offlinePriceRehabFollowup: { label: "Seguimiento de Rehab", unit: null, kind: "amount", section: "offlinePrices" },
  offlinePriceRecoverySession: { label: "Sesión suelta de Recovery", unit: null, kind: "amount", section: "offlinePrices" },
  offlinePricePerformanceClass: { label: "Clase suelta de Performance", unit: null, kind: "amount", section: "offlinePrices" },
  offlineUnpaidLimit: {
    label: "Máximo de cosas sin pagar",
    description: "Planes, sesiones y turnos sin pagar que puede tener un cliente a la vez. Al llegar, no puede reservar más.",
    unit: null,
    kind: "integer",
    range: { min: 1, max: 20 },
    section: "offlinePayments",
  },
  offlineDiscountEnabled: {
    label: "Aplicar descuento",
    unit: null,
    kind: "boolean",
    section: "offlinePayments",
    group: "Descuento",
  },
  offlineDiscountPercent: {
    label: "Descuento (%)",
    description: "Porcentaje entero. 10 = 10%.",
    unit: null,
    kind: "optionalInteger",
    range: { min: 1, max: 100 },
    section: "offlinePayments",
    dependsOn: "offlineDiscountEnabled",
  },
  transferEnabled: {
    label: "Aceptar transferencias",
    unit: null,
    kind: "boolean",
    section: "offlinePayments",
    group: "Transferencias",
  },
  transferDetails: {
    label: "Datos para transferir",
    description: "El cliente los ve tal cual al elegir Transferencia. Poné la cuenta y a qué WhatsApp mandar el comprobante.",
    unit: null,
    kind: "text",
    section: "offlinePayments",
    dependsOn: "transferEnabled",
  },
};

export const SETTING_KEYS = Object.keys(SETTING_FIELDS) as SettingKey[];

export function settingKeysOf(section: SettingSection): SettingKey[] {
  return SETTING_KEYS.filter((key) => SETTING_FIELDS[key].section === section);
}

export function settingLabel(key: SettingKey): string {
  const { label, unit } = SETTING_FIELDS[key];
  return unit === null ? label : `${label} (${unit})`;
}
