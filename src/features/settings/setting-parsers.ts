import type { SettingKey, SettingKind, SettingValue } from "./settings-fields";

export type SettingParse = { ok: true; value: SettingValue } | { ok: false; error: string };

export const MAX_OFFLINE_AMOUNT = 100000;
const AMOUNT_FORMAT_ERROR = "Ingresá un monto válido.";
const AMOUNT_DECIMALS_ERROR = "Máximo 2 decimales.";
const AMOUNT_MAX_ERROR = "El monto máximo es $ 100.000.";
const AMOUNT = /^\d+(\.\d{1,2})?$/;
const TOO_MANY_DECIMALS = /^\d+\.\d{3,}$/;
// "1.200": a dot followed by exactly three digits is a thousands separator.
const THOUSANDS_ONLY = /^\d{1,3}(\.\d{3})+$/;

// "1.200,50" and "1200,5" use the comma for decimals; without a comma, a dot is a decimal point unless it groups thousands.
function normalizeAmount(text: string): string {
  if (text.includes(",")) return text.replace(/\./g, "").replace(",", ".");
  return THOUSANDS_ONLY.test(text) ? text.replace(/\./g, "") : text;
}

const WHOLE_NUMBER = /^\d+$/;
const MAX_TEXT_LENGTH = 500;
// A decimal may be written with a comma or a dot, as people type it in es-UY.
const DECIMAL_NUMBER = /^\d+([.,]\d+)?$/;

// One parser per kind of setting, so a new kind is one more entry.
export const SETTING_PARSERS: Record<SettingKind, (text: string) => SettingParse> = {
  integer: (text) => {
    const trimmed = text.trim();
    if (!WHOLE_NUMBER.test(trimmed)) return { ok: false, error: "Ingresá un número entero." };
    return { ok: true, value: Number(trimmed) };
  },
  decimal: (text) => {
    const trimmed = text.trim();
    if (!DECIMAL_NUMBER.test(trimmed)) return { ok: false, error: "Ingresá un número (ej. 0,5)." };
    return { ok: true, value: Number(trimmed.replace(",", ".")) };
  },
  optionalInteger: (text) => {
    const trimmed = text.trim();
    if (trimmed === "") return { ok: true, value: null };
    if (!WHOLE_NUMBER.test(trimmed)) return { ok: false, error: "Ingresá un número entero." };
    return { ok: true, value: Number(trimmed) };
  },
  // The form keeps a yes/no as the string "true" or "false".
  boolean: (text) => ({ ok: true, value: text === "true" }),
  text: (text) => {
    const trimmed = text.trim();
    if (trimmed.length > MAX_TEXT_LENGTH) return { ok: false, error: `Hasta ${MAX_TEXT_LENGTH} caracteres.` };
    return { ok: true, value: trimmed === "" ? null : trimmed };
  },
  amount: (text) => {
    const trimmed = text.trim();
    if (trimmed === "") return { ok: true, value: null };
    const normalized = normalizeAmount(trimmed);
    if (TOO_MANY_DECIMALS.test(normalized)) return { ok: false, error: AMOUNT_DECIMALS_ERROR };
    if (!AMOUNT.test(normalized)) return { ok: false, error: AMOUNT_FORMAT_ERROR };
    const value = Number(normalized);
    if (value > MAX_OFFLINE_AMOUNT) return { ok: false, error: AMOUNT_MAX_ERROR };
    return { ok: true, value };
  },
};

// The API's wording for a whole number outside its limits; null (left empty) is only valid for an optional integer.
export function rangeError(
  kind: SettingKind,
  range: { min: number; max: number } | undefined,
  value: SettingValue,
): string | null {
  if (range === undefined || typeof value !== "number") return null;
  if (value >= range.min && value <= range.max) return null;
  const optional = kind === "optionalInteger" ? ", o vacío" : "";
  return `Tiene que ser un número entero entre ${range.min} y ${range.max}${optional}.`;
}

// The same rules as the API, so the screen warns before sending.
export function relationErrors(
  values: Partial<Record<SettingKey, SettingValue>>,
): Partial<Record<SettingKey, string>> {
  const errors: Partial<Record<SettingKey, string>> = {};
  const { noAttendanceDays, prolongedInactivityDays } = values;
  if (
    typeof noAttendanceDays === "number" &&
    typeof prolongedInactivityDays === "number" &&
    prolongedInactivityDays <= noAttendanceDays
  ) {
    errors.prolongedInactivityDays = "Tiene que ser mayor que los días sin asistir.";
  }
  if (values.offlineDiscountEnabled === true && values.offlineDiscountPercent === null) {
    errors.offlineDiscountPercent = "Poné el porcentaje de descuento.";
  }
  if (values.transferEnabled === true && values.transferDetails === null) {
    errors.transferDetails = "Escribí los datos para transferir.";
  }
  return errors;
}
