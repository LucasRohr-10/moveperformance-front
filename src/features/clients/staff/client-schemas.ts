import { z } from "zod";

import { toE164Phone } from "@/features/auth/phone";
import { getPhoneErrorMessage } from "@/features/auth/phone-input";
import { businessDateOf } from "@/features/checkout/business-time";
import type { ClientDetail, ClientProfileChanges } from "@/lib/api/types";
import { isValidBirthDate } from "@/lib/birth-date";

// The backend's limits, checked here first so the error reads in Spanish before any request.
export const CLIENT_PASSWORD_MIN_LENGTH = 8;
export const CLIENT_PASSWORD_MAX_LENGTH = 128;
export const CLIENT_NAME_MAX_LENGTH = 100;
export const CLIENT_EMAIL_MAX_LENGTH = 254;

const INVALID_EMAIL_MESSAGE = "Ingresá un email válido.";
const BIRTH_DATE_REQUIRED_MESSAGE = "Ingresá la fecha de nacimiento.";
const BIRTH_DATE_INVALID_MESSAGE = "Revisá la fecha de nacimiento.";
const NAME_TOO_LONG_MESSAGE = `Máximo ${CLIENT_NAME_MAX_LENGTH} caracteres.`;

// No trim: a password is saved exactly as staff typed or generated it.
export const clientPasswordSchema = z
  .string()
  .min(CLIENT_PASSWORD_MIN_LENGTH, { error: `La clave necesita al menos ${CLIENT_PASSWORD_MIN_LENGTH} caracteres.` })
  .max(CLIENT_PASSWORD_MAX_LENGTH, { error: `La clave puede tener hasta ${CLIENT_PASSWORD_MAX_LENGTH} caracteres.` });

const personNameSchema = (requiredMessage: string) =>
  z.string().trim().min(1, { error: requiredMessage }).max(CLIENT_NAME_MAX_LENGTH, { error: NAME_TOO_LONG_MESSAGE });

// YYYY-MM-DD from <input type="date">; "today" is read when validating, in Montevideo.
const clientBirthDateSchema = z
  .string()
  .trim()
  .min(1, { error: BIRTH_DATE_REQUIRED_MESSAGE, abort: true })
  .refine((value) => isValidBirthDate(value, businessDateOf(new Date().toISOString())), {
    error: BIRTH_DATE_INVALID_MESSAGE,
  });

// The API only takes E.164, so the form sends the converted number.
const clientPhoneSchema = z.string().transform((value, ctx) => {
  const phone = toE164Phone(value);
  if (!phone) {
    ctx.addIssue({ code: "custom", message: getPhoneErrorMessage(value) });
    return z.NEVER;
  }
  return phone;
});

const clientEmailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(CLIENT_EMAIL_MAX_LENGTH, { error: INVALID_EMAIL_MESSAGE })
  .pipe(z.email({ error: INVALID_EMAIL_MESSAGE }));

export const newClientSchema = z.object({
  name: personNameSchema("Ingresá el nombre."),
  lastName: personNameSchema("Ingresá el apellido."),
  birthDate: clientBirthDateSchema,
  email: clientEmailSchema,
  phone: clientPhoneSchema,
  password: clientPasswordSchema,
});

export type NewClientValues = z.input<typeof newClientSchema>;

/** What is in the edit form's inputs; `phone` is raw, as typed. */
export interface ClientProfileValues {
  name: string;
  lastName: string;
  phone: string;
  birthDate: string;
}

export type ProfileChangesResult =
  | { ok: true; changes: ClientProfileChanges }
  | { ok: false; errors: Partial<Record<keyof ClientProfileValues, string>> };

type ProfileInitial = Pick<ClientDetail, "name" | "lastName" | "phone" | "birthDate">;
type ProfileErrors = Partial<Record<keyof ClientProfileValues, string>>;

// Each field below answers "what goes in the PATCH?": nothing (unchanged, or empty and
// it never had a value), a new value, or an error. The API never accepts an empty value.
type FieldOutcome = { error: string } | { change: string } | null;

const hasError = (outcome: FieldOutcome): outcome is { error: string } => outcome !== null && "error" in outcome;
const hasChange = (outcome: FieldOutcome): outcome is { change: string } => outcome !== null && "change" in outcome;

function nameOutcome(initial: string, value: string, requiredMessage: string): FieldOutcome {
  const name = value.trim();
  if (name === "") return initial === "" ? null : { error: requiredMessage };
  if (name.length > CLIENT_NAME_MAX_LENGTH) return { error: NAME_TOO_LONG_MESSAGE };
  return name === initial ? null : { change: name };
}

function phoneOutcome(initial: string | null, value: string): FieldOutcome {
  if (value.trim() === "") return initial === null ? null : { error: getPhoneErrorMessage(value) };
  const phone = toE164Phone(value);
  if (!phone) return { error: getPhoneErrorMessage(value) };
  return phone === initial ? null : { change: phone };
}

function birthDateOutcome(initial: string | null, value: string): FieldOutcome {
  const birthDate = value.trim();
  if (birthDate === "") return initial === null ? null : { error: BIRTH_DATE_REQUIRED_MESSAGE };
  if (!isValidBirthDate(birthDate, businessDateOf(new Date().toISOString()))) {
    return { error: BIRTH_DATE_INVALID_MESSAGE };
  }
  return birthDate === initial ? null : { change: birthDate };
}

/** Compares the edit form with the client and keeps only the fields that changed, or says which ones to fix. */
export function clientProfileChanges(initial: ProfileInitial, values: ClientProfileValues): ProfileChangesResult {
  const outcomes: Record<keyof ClientProfileValues, FieldOutcome> = {
    name: nameOutcome(initial.name, values.name, "Ingresá el nombre."),
    lastName: nameOutcome(initial.lastName ?? "", values.lastName, "Ingresá el apellido."),
    phone: phoneOutcome(initial.phone, values.phone),
    birthDate: birthDateOutcome(initial.birthDate, values.birthDate),
  };

  const errors: ProfileErrors = {};
  const changes: ClientProfileChanges = {};
  for (const field of Object.keys(outcomes) as (keyof ClientProfileValues)[]) {
    const outcome = outcomes[field];
    if (hasError(outcome)) errors[field] = outcome.error;
    else if (hasChange(outcome)) changes[field] = outcome.change;
  }
  return Object.keys(errors).length > 0 ? { ok: false, errors } : { ok: true, changes };
}
