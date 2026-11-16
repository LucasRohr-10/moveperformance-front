import { parseJsonOrThrow } from "@/lib/api/client";
import { apiFetchServer } from "@/lib/api/server";
import type { MoneyStatsDto } from "@/lib/api/types";

import { toStatsQuery, type DashboardParams } from "../../dashboard-params";

export function getMoneyStats(params: DashboardParams): Promise<MoneyStatsDto> {
  return apiFetchServer(`/api/v1/staff/dashboard/stats/money?${toStatsQuery(params)}`).then(
    parseJsonOrThrow<MoneyStatsDto>,
  );
}
