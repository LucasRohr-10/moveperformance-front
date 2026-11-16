import { apiFetchClient, parseJsonOrThrow, throwIfError } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import type { PlanKind, ServiceType, StaffPlanDto } from "@/lib/api/types";

export type PlanKindField = "periodMonths" | "periodDays" | "sessionsIncluded" | "durationMinutes";

export interface PlanInput {
  service: ServiceType;
  kind: PlanKind;
  slug: string;
  name: string;
  description: string;
  features: string[];
  price: number;
  // `null` clears an optional kind-specific field.
  periodMonths?: number | null;
  periodDays?: number | null;
  sessionsIncluded?: number | null;
  durationMinutes?: number | null;
  featured: boolean;
  // Only sent for the kinds that can be debited.
  autoDebitEnabled?: boolean;
  sortOrder: number;
  isActive: boolean;
}

// service and kind cannot change after creation.
export type PlanPatch = Partial<Omit<PlanInput, "service" | "kind">>;

const JSON_HEADERS = { "Content-Type": "application/json" };
const PLANS_PATH = "/api/v1/staff/plans";

export function listStaffPlans(): Promise<StaffPlanDto[]> {
  return apiFetchClient(PLANS_PATH).then(parseJsonOrThrow<StaffPlanDto[]>);
}

// The API has no GET /staff/plans/:id yet; the list is short enough that
// fetching it and finding the row is cheap. Swap for a real single-resource
// endpoint if the backend adds one.
export function getPlan(id: string): Promise<StaffPlanDto> {
  return listStaffPlans().then((plans) => {
    const plan = plans.find((candidate) => candidate.id === id);
    if (!plan) {
      throw new ApiError({ statusCode: 404, code: "PLAN_NOT_FOUND", message: "No encontramos ese plan." });
    }
    return plan;
  });
}

export function createPlan(input: PlanInput): Promise<StaffPlanDto> {
  return apiFetchClient(PLANS_PATH, {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify(input),
  }).then(parseJsonOrThrow<StaffPlanDto>);
}

export function updatePlan(id: string, patch: PlanPatch): Promise<StaffPlanDto> {
  return apiFetchClient(`${PLANS_PATH}/${id}`, {
    method: "PATCH",
    headers: JSON_HEADERS,
    body: JSON.stringify(patch),
  }).then(parseJsonOrThrow<StaffPlanDto>);
}

// The API answers 204 with no body, so there is nothing to decode on success.
export async function deletePlan(id: string): Promise<void> {
  const response = await apiFetchClient(`${PLANS_PATH}/${id}`, { method: "DELETE" });
  await throwIfError(response);
}
