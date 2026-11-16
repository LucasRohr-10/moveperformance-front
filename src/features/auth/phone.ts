import { parsePhoneNumberFromString } from "libphonenumber-js/max";

// MOVE is in Uruguay: a number typed without "+" is read as Uruguayan.
const DEFAULT_COUNTRY = "UY";

// Digits and spaces only, with one optional "+" at the very start.
const PHONE_CHARACTERS = /^\+?[\d ]+$/;

export function hasOnlyPhoneCharacters(raw: string): boolean {
  return PHONE_CHARACTERS.test(raw.trim());
}

// What the user typed, in E.164 ("+59899123456"), or null when it is not a
// real number. "max" metadata matches the API's check exactly.
export function toE164Phone(raw: string): string | null {
  if (!hasOnlyPhoneCharacters(raw)) return null;
  const phone = parsePhoneNumberFromString(raw, DEFAULT_COUNTRY);
  return phone?.isValid() ? phone.number : null;
}
