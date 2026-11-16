import { useSyncExternalStore } from "react";

import { businessDateOf } from "@/features/checkout/business-time";

const subscribe = () => () => {};
const readToday = () => businessDateOf(new Date().toISOString());
const noTodayOnServer = () => undefined;

// Today in Montevideo (YYYY-MM-DD), read only in the browser: a prerendered page must not freeze the date.
// Undefined while prerendering and hydrating.
export function useBusinessToday(): string | undefined {
  return useSyncExternalStore(subscribe, readToday, noTodayOnServer);
}
