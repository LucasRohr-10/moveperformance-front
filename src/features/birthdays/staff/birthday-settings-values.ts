import { z } from "zod";

import type { BirthdaySettingsDto } from "@/lib/api/types";

import { BIRTHDAY_MESSAGE_MAX_LENGTH } from "../birthday-text";

export type BirthdaySettingsErrors = Partial<Record<"message", string>>;

const messageSchema = z
  .string()
  .trim()
  .min(1, { error: "Escribí el mensaje." })
  .max(BIRTHDAY_MESSAGE_MAX_LENGTH, { error: `Máximo ${BIRTHDAY_MESSAGE_MAX_LENGTH} caracteres.` });

// The front only warns before sending; the API validates the same.
export function validateBirthdaySettings(values: BirthdaySettingsDto): BirthdaySettingsErrors {
  const message = messageSchema.safeParse(values.message);
  return message.success ? {} : { message: message.error.issues[0].message };
}
