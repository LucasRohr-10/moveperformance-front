import { env } from "@/config/env";
import { parseJsonOrThrow } from "@/lib/api/client";
import type { PlanDto, ServiceType } from "@/lib/api/types";

// Public endpoint: it needs no session, so no cookies are forwarded.
export async function getPlans(service?: ServiceType): Promise<PlanDto[]> {
  const url = new URL("/api/v1/plans", env.NEXT_PUBLIC_API_URL);
  if (service) url.searchParams.set("service", service);

  const response = await fetch(url, { cache: "no-store" });
  return parseJsonOrThrow<PlanDto[]>(response);
}
