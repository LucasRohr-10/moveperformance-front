import type { ServiceType } from "@/lib/api/types";

import { SERVICE_PARAMS, type DashboardParams } from "../dashboard-params";

export const SERVICE_ORDER: ServiceType[] = ["performance", "rehab", "recovery"];

// CSS tokens, never hex: the charts and the tests that check them read the same names.
export const SERVICE_COLORS: Record<ServiceType, string> = {
  performance: "var(--color-performance)",
  rehab: "var(--color-rehab)",
  recovery: "var(--color-recovery)",
};

/** The services a tab draws: all three, or the one the URL filters by. */
export function shownServices(params: DashboardParams): ServiceType[] {
  return params.service === SERVICE_PARAMS.ALL ? SERVICE_ORDER : [params.service];
}
