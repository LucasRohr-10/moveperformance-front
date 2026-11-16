import { z } from "zod";

import type { AnnouncementDto } from "@/lib/api/types";

import { ANNOUNCEMENT_MAX_LENGTH } from "./announcements.constants";

export type AnnouncementFormValues = { body: string; visibleUntil: string };
export type AnnouncementFormErrors = Partial<Record<keyof AnnouncementFormValues, string>>;

const bodySchema = z
  .string()
  .trim()
  .min(1, { error: "Escribí el mensaje." })
  .max(ANNOUNCEMENT_MAX_LENGTH, { error: `Máximo ${ANNOUNCEMENT_MAX_LENGTH} caracteres.` });

// The front only warns before sending; the API validates the same.
// `today` is the business date (YYYY-MM-DD); two such dates compare as text, with no date math.
// Editing: the date is only checked when it changed, so the text of an expired announcement can be
// corrected without reviving it.
export function validateAnnouncementForm(
  values: AnnouncementFormValues,
  today: string,
  original?: AnnouncementDto,
): AnnouncementFormErrors {
  const errors: AnnouncementFormErrors = {};

  const body = bodySchema.safeParse(values.body);
  if (!body.success) errors.body = body.error.issues[0].message;

  if (values.visibleUntil === "") errors.visibleUntil = "Elegí una fecha.";
  else if (values.visibleUntil !== original?.visibleUntil && values.visibleUntil < today) {
    errors.visibleUntil = "Elegí hoy o una fecha posterior.";
  }

  return errors;
}
