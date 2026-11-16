"use client";

import { useCallback } from "react";

import { ApiError } from "@/lib/api/errors";
import type { ClientFollowupDto } from "@/lib/api/types";

import { apiErrorMessage } from "./api-error-message";
import { endPause, getClientFollowup } from "./followup-api";
import type { ActionResult } from "./use-followup-alerts";
import { type LoadState, useLoadState } from "./use-load-state";

// The client has no pause to end: someone else ended it first.
const STALE_PAUSE_CODE = "NO_ACTIVE_PAUSE";
const END_FAILED_MESSAGE = "No pudimos finalizar la pausa. Probá de nuevo.";

/** The pause, past pauses and contacts of one client, and the action to end the active pause. */
export function useClientFollowup(clientId: string): {
  state: LoadState<ClientFollowupDto>;
  reload: () => void;
  endActivePause: () => Promise<ActionResult>;
} {
  const load = useCallback(() => getClientFollowup(clientId), [clientId]);
  const { state, reload } = useLoadState(load);

  const endActivePause = useCallback(async (): Promise<ActionResult> => {
    try {
      await endPause(clientId);
      reload();
      return { ok: true };
    } catch (error) {
      const isStale = error instanceof ApiError && error.body.code === STALE_PAUSE_CODE;
      if (isStale) reload();
      return { ok: false, message: apiErrorMessage(error, END_FAILED_MESSAGE), isStale };
    }
  }, [clientId, reload]);

  return { state, reload, endActivePause };
}
