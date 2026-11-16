import { parseJsonOrThrow } from "@/lib/api/client";
import { apiFetchServer } from "@/lib/api/server";
import type { SlotsStatsDto } from "@/lib/api/types";

import { toStatsQuery, type DashboardParams } from "../../dashboard-params";

export function getSlotsStats(params: DashboardParams): Promise<SlotsStatsDto> {
  return apiFetchServer(`/api/v1/staff/dashboard/stats/slots?${toStatsQuery(params)}`).then(
    parseJsonOrThrow<SlotsStatsDto>,
  );
}
