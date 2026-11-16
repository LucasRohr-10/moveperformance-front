import { cache } from "react";

import { parseJsonOrThrow } from "@/lib/api/client";
import { apiFetchServer } from "@/lib/api/server";
import type { TodaySummaryDto } from "@/lib/api/types";

// Cached per request: the header line, the tiles and the Hoy badge all read the same summary.
export const getTodaySummary = cache(
  (): Promise<TodaySummaryDto> =>
    apiFetchServer("/api/v1/staff/dashboard/today").then(parseJsonOrThrow<TodaySummaryDto>),
);
