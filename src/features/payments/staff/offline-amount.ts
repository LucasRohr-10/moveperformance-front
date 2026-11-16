export const MAX_OFFLINE_AMOUNT = 100000;

export type AmountResult = { ok: true; value: number | null } | { ok: false; error: string };

const REQUIRED_ERROR = "Ingresá el monto que pagó.";
const INVALID_ERROR = "Ingresá un monto válido.";
const DECIMALS_ERROR = "Máximo 2 decimales.";
const MAX_ERROR = "El monto máximo es $ 100.000.";

const DIGITS = /^\d+$/;
const THOUSANDS = /^\d{1,3}(\.\d{3})+$/;

// "1.200,50" and "1200,5" use the comma for decimals; without a comma "1.200" is thousands and "1200.5" is decimals.
function splitAmount(text: string): { whole: string; decimals: string } | null {
  const commas = text.split(",");
  if (commas.length > 2) return null;
  if (commas.length === 2) {
    const [whole, decimals] = commas;
    const cleanWhole = DIGITS.test(whole) ? whole : THOUSANDS.test(whole) ? whole.replaceAll(".", "") : null;
    return cleanWhole !== null && DIGITS.test(decimals) ? { whole: cleanWhole, decimals } : null;
  }
  if (DIGITS.test(text)) return { whole: text, decimals: "" };
  if (THOUSANDS.test(text)) return { whole: text.replaceAll(".", ""), decimals: "" };
  const dots = text.split(".");
  if (dots.length === 2 && DIGITS.test(dots[0]) && DIGITS.test(dots[1])) {
    return { whole: dots[0], decimals: dots[1] };
  }
  return null;
}

/** Reads what staff typed as pesos. Empty is `null` unless `required`. */
export function parseOfflineAmount(raw: string, required: boolean): AmountResult {
  const text = raw.trim();
  if (text === "") return required ? { ok: false, error: REQUIRED_ERROR } : { ok: true, value: null };

  const parts = splitAmount(text);
  if (!parts) return { ok: false, error: INVALID_ERROR };
  if (parts.decimals.length > 2) return { ok: false, error: DECIMALS_ERROR };

  const value = Number(parts.decimals ? `${parts.whole}.${parts.decimals}` : parts.whole);
  if (value > MAX_OFFLINE_AMOUNT) return { ok: false, error: MAX_ERROR };
  return { ok: true, value };
}

/** The amount as it is written in the field: whole pesos plain, cents with a comma. */
export function formatAmountInput(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(".", ",");
}
