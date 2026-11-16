"use client";

import { useEffect, useMemo, useReducer, useState } from "react";
import { useRouter } from "next/navigation";

import { useSnackbar } from "@/components/ui/snackbar";
import { ROUTES } from "@/config/constants/routes.constants";
import { saveErrorSnackbar } from "@/features/scheduling/staff/template-form-model";
import { ApiError } from "@/lib/api/errors";
import type { DayDraftDto, DayEditorDto, DayImpactDto } from "@/lib/api/types";

import {
  draftReducer,
  initialDraft,
  localSummary,
  toDraftDto,
  type DayDraftState,
  type DraftAction,
  type LocalSummary,
} from "./day-draft-model";
import { applyDay, getDayEditor, previewDay } from "./day-editor-api";
import { pluralize } from "./plural";

type LoadStatus = "loading" | "ready" | "error";

const STALE_CODE = "DAY_EDIT_STALE";
const REASON_REQUIRED_MESSAGE = "Escribí el motivo: le llega a cada cliente afectado.";
const SAVE_FALLBACK = "No pudimos guardar los cambios";

type HookAction = DraftAction | { type: "load"; editor: DayEditorDto };

function hookReducer(state: DayDraftState | null, action: HookAction): DayDraftState | null {
  // A range only exists to close days, so it opens already closing. Picking another range reloads the editor:
  // closing the day carries over, the rest of the draft does not.
  if (action.type === "load") {
    return { ...initialDraft(action.editor), closeWholeDay: state?.closeWholeDay ?? action.editor.isRange };
  }
  return state ? draftReducer(state, action) : state;
}

function savedDescription(impact: DayImpactDto): string | undefined {
  const parts = [
    impact.cancelledSlots > 0 ? pluralize(impact.cancelledSlots, "turno cancelado", "turnos cancelados") : null,
    impact.affectedBookings.total > 0
      ? pluralize(impact.affectedBookings.total, "reserva cancelada", "reservas canceladas")
      : null,
  ].filter((part): part is string => part !== null);
  return parts.length > 0 ? parts.join(" · ") : undefined;
}

export interface DayDraft {
  status: LoadStatus;
  editor: DayEditorDto | null;
  // Null until the editor loads.
  state: DayDraftState | null;
  dispatch: (action: DraftAction) => void;
  summary: LocalSummary | null;
  reasonError: string | null;
  pendingConfirmation: DayImpactDto | null;
  /** Checks the reason, asks the backend what would change and either opens the confirmation or applies. */
  requestSave: () => Promise<void>;
  /** Applies with the number of bookings the confirmation showed. */
  confirmSave: () => Promise<void>;
  cancelConfirmation: () => void;
  retry: () => void;
  isSaving: boolean;
}

export function useDayDraft(from: string, to?: string): DayDraft {
  const router = useRouter();
  const { showSnackbar } = useSnackbar();
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [state, dispatch] = useReducer(hookReducer, null);
  const [reloadToken, setReloadToken] = useState(0);
  const [wantsReason, setWantsReason] = useState(false);
  const [pendingConfirmation, setPendingConfirmation] = useState<DayImpactDto | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  // Once saved the draft is no longer "unsaved", even though its numbers still differ from the old editor.
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    let isCurrent = true;
    getDayEditor(from, to)
      .then((editor) => {
        if (!isCurrent) return;
        dispatch({ type: "load", editor });
        setStatus("ready");
      })
      .catch(() => {
        if (isCurrent) setStatus("error");
      });
    return () => {
      isCurrent = false;
    };
  }, [from, to, reloadToken]);

  const summary = useMemo(() => (state ? localSummary(state, state.editor) : null), [state]);
  const hasUnsavedChanges = Boolean(summary?.isDirty) && !isSaved;

  useEffect(() => {
    if (!hasUnsavedChanges) return;
    function warn(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [hasUnsavedChanges]);

  const reasonError =
    wantsReason && summary?.needsReason && state?.reason.trim() === "" ? REASON_REQUIRED_MESSAGE : null;

  function retry() {
    setStatus("loading");
    setReloadToken((token) => token + 1);
  }

  function finishSaved(impact: DayImpactDto) {
    setIsSaved(true);
    setPendingConfirmation(null);
    showSnackbar({ tone: "success", title: "Cambios guardados", message: savedDescription(impact) });
    router.push(`${ROUTES.STAFF_SCHEDULE}?date=${from}`);
  }

  function failSave(error: unknown) {
    setPendingConfirmation(null);
    showSnackbar(saveErrorSnackbar(error, SAVE_FALLBACK));
  }

  async function requestSave() {
    if (!state || !summary || isSaving || !summary.isDirty) return;
    if (summary.needsReason && state.reason.trim() === "") {
      setWantsReason(true);
      return;
    }
    setIsSaving(true);
    try {
      const draft = toDraftDto(state);
      const impact = await previewDay(draft);
      if (impact.affectedBookings.total > 0) {
        setPendingConfirmation(impact);
        return;
      }
      finishSaved(await applyDay(draft, impact.affectedBookings.total));
    } catch (error) {
      failSave(error);
    } finally {
      setIsSaving(false);
    }
  }

  async function confirmSave() {
    if (!state || !pendingConfirmation || isSaving) return;
    setIsSaving(true);
    const draft: DayDraftDto = toDraftDto(state);
    try {
      finishSaved(await applyDay(draft, pendingConfirmation.affectedBookings.total));
    } catch (error) {
      if (error instanceof ApiError && error.body.code === STALE_CODE) {
        await reopenWithFreshNumbers(draft);
      } else {
        failSave(error);
      }
    } finally {
      setIsSaving(false);
    }
  }

  // Bookings came in or went out since the preview: show the new numbers, keep the draft.
  async function reopenWithFreshNumbers(draft: DayDraftDto) {
    try {
      setPendingConfirmation(await previewDay(draft));
    } catch (error) {
      failSave(error);
    }
  }

  return {
    status,
    editor: state?.editor ?? null,
    state,
    dispatch,
    summary,
    reasonError,
    pendingConfirmation,
    requestSave,
    confirmSave,
    cancelConfirmation: () => setPendingConfirmation(null),
    retry,
    isSaving,
  };
}
