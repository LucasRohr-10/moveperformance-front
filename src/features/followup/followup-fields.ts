import { z } from "zod";

export type FieldParse = { ok: true; value: string | undefined } | { ok: false; error: string };

const NOTE_MAX_LENGTH = 1000;
const BUSINESS_DATE = /^\d{4}-\d{2}-\d{2}$/;

const noteSchema = z
  .string()
  .trim()
  .max(NOTE_MAX_LENGTH, { error: `La nota es demasiado larga (máximo ${NOTE_MAX_LENGTH} caracteres).` })
  .refine((text) => !text.includes("\u0000"), { error: "La nota contiene caracteres no permitidos." });

function toParse(result: z.ZodSafeParseResult<string>): FieldParse {
  if (!result.success) return { ok: false, error: result.error.issues[0].message };
  return { ok: true, value: result.data === "" ? undefined : result.data };
}

// The front only checks the shape to warn before sending; the API validates the same.
export function parseNote(text: string): FieldParse {
  return toParse(noteSchema.safeParse(text));
}

// `today` is the business date (YYYY-MM-DD); two such dates compare as text, with no date math.
export function parseRecontactOn(text: string, today: string): FieldParse {
  if (text === "") return { ok: true, value: undefined };
  if (!BUSINESS_DATE.test(text)) return { ok: false, error: "Ingresá una fecha válida." };
  if (text < today) return { ok: false, error: "La fecha de re-contacto no puede ser anterior a hoy." };
  return { ok: true, value: text };
}
