import { apiFetchClient, parseJsonOrThrow } from "@/lib/api/client";
import type { Professional } from "@/lib/api/types";

export function listProfessionals(): Promise<Professional[]> {
  return apiFetchClient("/api/v1/staff/professionals").then(parseJsonOrThrow<Professional[]>);
}

export function createProfessional(input: { name: string }): Promise<Professional> {
  return apiFetchClient("/api/v1/staff/professionals", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  }).then(parseJsonOrThrow<Professional>);
}

export function updateProfessional(id: string, patch: { name?: string; active?: boolean }): Promise<Professional> {
  return apiFetchClient(`/api/v1/staff/professionals/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  }).then(parseJsonOrThrow<Professional>);
}
