import { unstable_rethrow } from "next/navigation";

import { DashboardViewSwitch } from "../dashboard-view-switch";
import type { DashboardParams } from "../dashboard-params";
import { getBirthdaysToday } from "./get-birthdays-today";
import { getTodaySummary } from "./get-today-summary";
import { countPending } from "./hoy-tiles";

async function loadPendingCount(): Promise<number | null> {
  try {
    const summary = await getTodaySummary();
    // A birthday that cannot be read is only a missing +1: the rest of the count still holds.
    const birthdays = await getBirthdaysToday().catch((error: unknown) => {
      unstable_rethrow(error);
      return null;
    });
    return countPending(summary, (birthdays?.items.length ?? 0) > 0);
  } catch (error) {
    unstable_rethrow(error);
    return null;
  }
}

/** The view switch with the Hoy badge, which needs the summary: it waits inside its own `Suspense`. */
export async function PendingViewSwitch({ params }: { params: DashboardParams }) {
  return <DashboardViewSwitch params={params} pendingCount={await loadPendingCount()} />;
}
