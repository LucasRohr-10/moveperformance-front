"use client";

import { useCallback } from "react";

import { ApiError } from "@/lib/api/errors";
import type { AlertCountsDto, AlertDto, AlertType } from "@/lib/api/types";

import { apiErrorMessage } from "./api-error-message";
import { getAlertCounts, handleAlert, listAlerts } from "./followup-api";
import { type LoadState, useLoadState } from "./use-load-state";

export type ActionResult = { ok: true } | { ok: false; message: string; isStale: boolean };

// The alert is no longer there to handle: another staff did it, or it was closed meanwhile.
const STALE_ALERT_CODES: readonly string[] = ["ALERT_ALREADY_HANDLED", "ALERT_NOT_FOUND"];
export function isStaleAlertError(error: unknown): boolean {
  return error instanceof ApiError && STALE_ALERT_CODES.includes(error.body.code);
}

const HANDLE_FAILED_MESSAGE = "No pudimos marcar la alerta como gestionada. Probá de nuevo.";

/** The open alerts of a type (all when null, or only the ones at risk with `riskOnly`) and the counters of every type, loaded apart from each other. */
export function useFollowupAlerts(type: AlertType | null, riskOnly = false): {
  alerts: LoadState<AlertDto[]>;
  counts: LoadState<AlertCountsDto>;
  reload: () => void;
  handle: (id: string) => Promise<ActionResult>;
} {
  const loadAlerts = useCallback(
    () => (riskOnly ? listAlerts(undefined, "risk") : listAlerts(type ?? undefined)),
    [type, riskOnly],
  );
  const { state: alerts, reload: reloadAlerts } = useLoadState(loadAlerts);
  const { state: counts, reload: reloadCounts } = useLoadState(getAlertCounts);

  const reload = useCallback(() => {
    reloadAlerts();
    reloadCounts();
  }, [reloadAlerts, reloadCounts]);

  const handle = useCallback(
    async (id: string): Promise<ActionResult> => {
      try {
        await handleAlert(id);
        reload();
        return { ok: true };
      } catch (error) {
        const isStale = isStaleAlertError(error);
        if (isStale) reload();
        return { ok: false, message: apiErrorMessage(error, HANDLE_FAILED_MESSAGE), isStale };
      }
    },
    [reload],
  );

  return { alerts, counts, reload, handle };
}
