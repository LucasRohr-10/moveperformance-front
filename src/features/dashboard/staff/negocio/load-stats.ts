import { unstable_rethrow } from "next/navigation";

import { isInvalidRangeError, isUnsupportedCurrencyError } from "./negocio-section-error";

// A failing API stays inside the tab: the tabs and the controls keep working. Next's own control-flow errors
// (redirect, prerender bail-outs) are rethrown untouched. A refused range and a foreign currency are told apart: neither has a retry.
export type StatsLoad<T> = { stats: T } | { failure: "invalid-range" | "unsupported-currency" | "unavailable" };

export async function loadStats<T>(fetchStats: () => Promise<T>): Promise<StatsLoad<T>> {
  try {
    return { stats: await fetchStats() };
  } catch (error) {
    unstable_rethrow(error);
    if (isInvalidRangeError(error)) return { failure: "invalid-range" };
    return { failure: isUnsupportedCurrencyError(error) ? "unsupported-currency" : "unavailable" };
  }
}
