import { z } from "zod";

import { ApiError } from "@/lib/api/errors";
import type { PlanKind, StaffPlanDto } from "@/lib/api/types";

import { PLAN_KIND_FIELDS } from "./plan-kind-fields";
import type { PlanInput, PlanKindField, PlanPatch } from "./staff-plans-api";

// Everything the inputs hold is text; it becomes numbers only when it is sent.
export type PlanFormValues = Record<string, string>;
export type PlanFormErrors = Partial<Record<string, string>>;

const DEFAULT_KIND: PlanKind = "period_plan";

const requiredText = (message: string, min: number, max: number) =>
  z.string().trim().min(min, { error: message }).max(max, { error: message });
const wholeNumber = z.string().trim().regex(/^\d+$/, { error: "Ingresá un número entero." });
// Same shape as `wholeNumber` (whole numbers only, so already >= 0) with a
// message naming the actual constraint, matching the API's `@Min(0)`.
const priceNumber = z
  .string()
  .trim()
  .regex(/^\d+$/, { error: "Ingresá un precio mayor o igual a cero." });
const slugPattern = z
  .string()
  .trim()
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, { error: "Usá minúsculas, números y guiones (ej. paquete-4)." });

export function slugFromName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function toFormValues(plan?: StaffPlanDto): PlanFormValues {
  return {
    kind: plan?.kind ?? DEFAULT_KIND,
    name: plan?.name ?? "",
    slug: plan?.slug ?? "",
    description: plan?.description ?? "",
    features: plan?.features.join("\n") ?? "",
    price: String(plan?.price ?? ""),
    periodMonths: String(plan?.periodMonths ?? ""),
    periodDays: String(plan?.periodDays ?? ""),
    sessionsIncluded: String(plan?.sessionsIncluded ?? ""),
    durationMinutes: String(plan?.durationMinutes ?? ""),
    sortOrder: String(plan?.sortOrder ?? 0),
    featured: String(plan?.featured ?? false),
    autoDebitEnabled: String(plan?.autoDebitEnabled ?? false),
  };
}

const parseFeatures = (text: string): string[] =>
  text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

const kindOf = (values: PlanFormValues): PlanKind => values.kind as PlanKind;

// Only the fields the kind uses; an empty one is `undefined`.
function kindFieldNumbers(values: PlanFormValues, kind: PlanKind): Partial<Record<PlanKindField, number>> {
  const numbers: Partial<Record<PlanKindField, number>> = {};
  for (const { name } of PLAN_KIND_FIELDS[kind].fields) {
    const text = values[name]?.trim();
    if (text) numbers[name] = Number(text);
  }
  return numbers;
}

export function toPlanInput(values: PlanFormValues): PlanInput {
  const kind = kindOf(values);
  return {
    service: PLAN_KIND_FIELDS[kind].service,
    kind,
    slug: values.slug.trim(),
    name: values.name.trim(),
    description: values.description.trim(),
    features: parseFeatures(values.features),
    price: Number(values.price),
    ...kindFieldNumbers(values, kind),
    featured: values.featured === "true",
    ...(PLAN_KIND_FIELDS[kind].allowsAutoDebit ? { autoDebitEnabled: values.autoDebitEnabled === "true" } : {}),
    sortOrder: Number(values.sortOrder),
    isActive: true,
  };
}

const sameList = (a: string[], b: string[]) => a.length === b.length && a.every((item, index) => item === b[index]);

export function toPlanPatch(values: PlanFormValues, plan: StaffPlanDto): PlanPatch {
  const next = toPlanInput({ ...values, kind: plan.kind });
  const patch: PlanPatch = {};

  if (next.slug !== plan.slug) patch.slug = next.slug;
  if (next.name !== plan.name) patch.name = next.name;
  if (next.description !== plan.description) patch.description = next.description;
  if (!sameList(next.features, plan.features)) patch.features = next.features;
  if (next.price !== plan.price) patch.price = next.price;
  if (next.featured !== plan.featured) patch.featured = next.featured;
  if (next.autoDebitEnabled !== undefined && next.autoDebitEnabled !== plan.autoDebitEnabled) {
    patch.autoDebitEnabled = next.autoDebitEnabled;
  }
  if (next.sortOrder !== plan.sortOrder) patch.sortOrder = next.sortOrder;

  for (const { name } of PLAN_KIND_FIELDS[plan.kind].fields) {
    const wasEmptied = next[name] === undefined && plan[name] !== null;
    if (wasEmptied) Object.assign(patch, { [name]: null });
    else if (next[name] !== undefined && next[name] !== plan[name]) Object.assign(patch, { [name]: next[name] });
  }
  return patch;
}

// Format only: ranges and kind rules belong to the API, whose messages are shown under each field.
export function validatePlanForm(values: PlanFormValues): PlanFormErrors {
  const errors: PlanFormErrors = {};
  const check = (field: string, schema: z.ZodType<string>, value: string) => {
    const result = schema.safeParse(value);
    if (!result.success) errors[field] = result.error.issues[0]?.message;
  };

  check("name", requiredText("El nombre tiene entre 2 y 80 caracteres.", 2, 80), values.name);
  check("slug", slugPattern, values.slug);
  check("price", priceNumber, values.price);
  check("sortOrder", wholeNumber, values.sortOrder);
  for (const { name, isOptional } of PLAN_KIND_FIELDS[kindOf(values)].fields) {
    if (isOptional && !values[name]?.trim()) continue;
    check(name, wholeNumber, values[name] ?? "");
  }
  return errors;
}

export function fieldErrorsFrom(error: unknown): PlanFormErrors {
  if (!(error instanceof ApiError)) return {};
  if (error.body.code === "SLUG_TAKEN") return { slug: error.body.message };

  const errors: PlanFormErrors = {};
  for (const { field, messages } of error.body.details ?? []) {
    if (messages[0]) errors[field] = messages[0];
  }
  return errors;
}

// Switching kind starts the kind-specific inputs from scratch, so values of the old kind are never sent.
export const EMPTIED_KIND_FIELDS: Record<PlanKindField, string> = {
  periodMonths: "",
  periodDays: "",
  sessionsIncluded: "",
  durationMinutes: "",
};
