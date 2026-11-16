import { apiFetchClient, parseJsonOrThrow } from "@/lib/api/client";
import type { ScheduleTemplate, ServiceType, TemplateDay } from "@/lib/api/types";

export interface TemplateInput {
  service: ServiceType;
  days: TemplateDay[];
  durationMinutes: number;
  gapMinutes: number;
  capacity: number;
  professionalId: string | null;
}

export type TemplateChange = Omit<TemplateInput, "service">;

const JSON_HEADERS = { "Content-Type": "application/json" };

export function listTemplates(): Promise<ScheduleTemplate[]> {
  return apiFetchClient("/api/v1/staff/templates").then(parseJsonOrThrow<ScheduleTemplate[]>);
}

// The days staff edited by hand are the ones a new template leaves empty.
export type CreatedTemplate = ScheduleTemplate & { skippedEditedDays?: string[] };

export function createTemplate(input: TemplateInput): Promise<CreatedTemplate> {
  const { professionalId, ...rest } = input;
  return apiFetchClient("/api/v1/staff/templates", {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify(professionalId ? { ...rest, professionalId } : rest),
  }).then(parseJsonOrThrow<CreatedTemplate>);
}

export function updateTemplate(id: string, input: TemplateChange): Promise<ScheduleTemplate> {
  return apiFetchClient(`/api/v1/staff/templates/${id}`, {
    method: "PATCH",
    headers: JSON_HEADERS,
    body: JSON.stringify(input),
  }).then(parseJsonOrThrow<ScheduleTemplate>);
}

export interface TemplateImpact {
  affectedBookings: number;
  // YYYY-MM-DD days staff edited by hand, where no slots get created.
  skippedEditedDays: string[];
}

export function previewTemplateImpact(
  id: string,
  change: TemplateChange | { active: false },
): Promise<TemplateImpact> {
  return apiFetchClient(`/api/v1/staff/templates/${id}/impact`, {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify(change),
  }).then(parseJsonOrThrow<TemplateImpact>);
}

export function removeTemplate(id: string): Promise<void> {
  return apiFetchClient(`/api/v1/staff/templates/${id}`, { method: "DELETE" }).then(() => undefined);
}
