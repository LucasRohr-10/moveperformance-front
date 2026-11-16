import { cache } from "react";

import { parseJsonOrThrow } from "@/lib/api/client";
import { apiFetchServer } from "@/lib/api/server";
import type { ToCollectTodayDto } from "@/lib/api/types";

export const getToCollectToday = cache(
  (): Promise<ToCollectTodayDto> =>
    apiFetchServer("/api/v1/staff/dashboard/to-collect-today").then(parseJsonOrThrow<ToCollectTodayDto>),
);
