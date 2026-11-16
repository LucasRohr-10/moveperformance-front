import { cache } from "react";

import { parseJsonOrThrow } from "@/lib/api/client";
import { apiFetchServer } from "@/lib/api/server";
import type { BirthdaysTodayDto } from "@/lib/api/types";

// Cached per request: the birthday card and the Hoy badge both read it.
export const getBirthdaysToday = cache(
  (): Promise<BirthdaysTodayDto> =>
    apiFetchServer("/api/v1/staff/dashboard/birthdays-today").then(parseJsonOrThrow<BirthdaysTodayDto>),
);
