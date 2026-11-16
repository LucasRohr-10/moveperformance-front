import type { OfflinePriceSettings, RehabKind, ServiceType } from "@/lib/api/types";

/** The staff prices from `GET /staff/settings`, one per kind of session; `null` when Configuración has none. */
export interface OfflinePrices {
  rehabEvaluation: number | null;
  rehabFollowup: number | null;
  recoverySession: number | null;
  performanceClass: number | null;
}

// Which price a slot takes, like the backend's OFFLINE_PRICE_KEY. Only Rehab tells its kinds apart.
const OFFLINE_PRICE_KEY: Record<ServiceType, Record<RehabKind, keyof OfflinePrices>> = {
  performance: { evaluation: "performanceClass", followup: "performanceClass" },
  recovery: { evaluation: "recoverySession", followup: "recoverySession" },
  rehab: { evaluation: "rehabEvaluation", followup: "rehabFollowup" },
};

/** Only to show the price in the pop-up: the backend applies the same rule when it books. */
export function offlinePriceFor(
  prices: OfflinePrices,
  service: ServiceType,
  rehabKind: RehabKind | null,
): number | null {
  return prices[OFFLINE_PRICE_KEY[service][rehabKind ?? "evaluation"]];
}

/** The prices for the pop-up; all empty when the settings could not be read (the backend still prices the booking). */
export function toOfflinePrices(settings: OfflinePriceSettings | null): OfflinePrices {
  return {
    rehabEvaluation: settings?.offlinePriceRehabEvaluation ?? null,
    rehabFollowup: settings?.offlinePriceRehabFollowup ?? null,
    recoverySession: settings?.offlinePriceRecoverySession ?? null,
    performanceClass: settings?.offlinePricePerformanceClass ?? null,
  };
}
