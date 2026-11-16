"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { ROUTES } from "@/config/constants/routes.constants";
import { todayBusinessDate } from "@/features/bookings/slots";
import type { DayEditorDto, ServiceType } from "@/lib/api/types";

import { DayEditConfirmDialog } from "./day-edit-confirm-dialog";
import { buildChangeGroups, buildTurnoRows, closeDayChanges, SERVICE_ORDER } from "./day-editor-model";
import { DayEditorDesktop } from "./day-editor-desktop";
import { DayEditorMobile, DayEditorMobileHeader } from "./day-editor-mobile";
import type { DayEditorViewProps, EditorMode } from "./day-editor-view";
import { formatEditDayLabel, formatEditDayScope, formatEditDayShort } from "./edit-day-params";
import { pluralize } from "./plural";
import { useDayDraft } from "./use-day-draft";

function editorUrl(from: string, to?: string): string {
  const params = new URLSearchParams({ date: from });
  if (to) params.set("to", to);
  return `${ROUTES.STAFF_SCHEDULE_EDIT}?${params}`;
}

function firstServiceWithBands(editor: DayEditorDto): ServiceType {
  return SERVICE_ORDER.find((service) => editor.services.some((entry) => entry.service === service && entry.bands.length > 0)) ?? SERVICE_ORDER[0];
}

function lowerFirst(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1);
}

function closeDescription(cancelledSlots: number, bookings: number, when: string): string {
  const slots =
    cancelledSlots === 1 ? "Se cancela 1 turno que queda" : `Se cancelan los ${cancelledSlots} turnos que quedan`;
  const bookingsText = bookings > 0 ? `, con ${pluralize(bookings, "reserva", "reservas")}.` : ".";
  return `${slots} ${when} en Recovery, Rehab y Performance${bookingsText}`;
}

function LoadingState() {
  return (
    <div role="status">
      <span className="sr-only">Cargando el día…</span>
      <Skeleton className="h-72 w-full bg-card" />
    </div>
  );
}

// The page's one client component: loads the day, holds the draft and the choices around it,
// and hands the same props to the desktop and the phone layout (CSS shows one of them).
export function DayEditorPanel({ from, to }: { from: string; to?: string }) {
  const router = useRouter();
  const draft = useDayDraft(from, to);
  const [selected, setSelected] = useState<ServiceType | null>(null);
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  // Several days is only chosen when closing, and it is only real once the last day is picked (the URL's `to`).
  const [isMultiDay, setIsMultiDay] = useState(Boolean(to));

  const header = <DayEditorMobileHeader dateLabel={formatEditDayLabel(from, to)} />;

  if (draft.status === "loading") {
    return (
      <>
        {header}
        <LoadingState />
      </>
    );
  }
  if (draft.status === "error" || !draft.editor || !draft.state || !draft.summary) {
    return (
      <>
        {header}
        <Card padding="none">
          <EmptyState
            title="No pudimos cargar el día"
            description="Puede ser un problema temporario del servidor, o que ese día ya no se pueda editar."
            role="alert"
            action={
              <Button variant="secondary" touchTarget onClick={draft.retry}>
                Reintentar
              </Button>
            }
          />
        </Card>
      </>
    );
  }

  const { editor, state, summary, dispatch } = draft;
  const service = selected ?? firstServiceWithBands(editor);
  const mode: EditorMode = state.closeWholeDay ? "close" : "edit";
  const isWaitingForLastDay = mode === "close" && isMultiDay && !editor.isRange;
  const until = editor.isRange ? editor.to : "";

  function resetChoices() {
    setOpenKey(null);
    setIsAdding(false);
  }

  function singleDay() {
    if (editor.isRange) router.replace(editorUrl(editor.from));
  }

  function changeMode(next: EditorMode) {
    if (next === mode) return;
    dispatch({ type: "toggleCloseDay" });
    resetChoices();
    if (next === "edit") {
      setIsMultiDay(false);
      singleDay();
    }
  }

  function changeMultiDay(next: boolean) {
    setIsMultiDay(next);
    if (!next) singleDay();
  }

  function discard() {
    dispatch({ type: "reset" });
    setIsMultiDay(false);
    resetChoices();
    singleDay();
  }

  const cancelledSlots = summary.cancelledSlots.count;
  const scope = formatEditDayScope(editor.from, editor.isRange ? editor.to : undefined);
  const when = editor.isRange ? "en esos días" : editor.from === todayBusinessDate() ? "hoy" : "ese día";
  const rows = buildTurnoRows(state, service);

  const viewProps: DayEditorViewProps = {
    editor,
    state,
    summary,
    dispatch,
    mode,
    onModeChange: changeMode,
    service,
    onServiceChange: (next) => {
      setSelected(next);
      resetChoices();
    },
    rows,
    openKey,
    onOpenChange: setOpenKey,
    isAdding,
    onAddingChange: setIsAdding,
    isMultiDay,
    onMultiDayChange: changeMultiDay,
    until,
    onUntilChange: (date) => router.replace(editorUrl(editor.from, date > editor.from ? date : undefined)),
    closeTitle: isMultiDay
      ? editor.isRange
        ? `MOVE cierra ${lowerFirst(scope)}`
        : "Elegí hasta qué día"
      : `MOVE cierra el ${lowerFirst(scope)}`,
    closeDescription: closeDescription(cancelledSlots, summary.bookingsInCancelledSlots, when),
    groups:
      mode === "close"
        ? isWaitingForLastDay
          ? []
          : closeDayChanges(scope, cancelledSlots, summary.bookingsInCancelledSlots)
        : buildChangeGroups(state),
    emptyHint: mode === "close" ? "Elegí hasta qué día para ver el resumen." : "Todavía no cambiaste nada.",
    canSave: summary.isDirty && !isWaitingForLastDay,
    saveLabel: mode === "close" ? "Cerrar día" : "Guardar cambios",
    isSaving: draft.isSaving,
    reasonError: draft.reasonError,
    onSave: draft.requestSave,
    onDiscard: discard,
  };

  return (
    <>
      {header}
      <DayEditorDesktop {...viewProps} />
      <DayEditorMobile {...viewProps} />

      {draft.pendingConfirmation ? (
        <DayEditConfirmDialog
          impact={draft.pendingConfirmation}
          subtitle={`${formatEditDayShort(editor.from, editor.isRange ? editor.to : undefined)} · ${summary.cancelledSlots.detail}`}
          reason={state.reason.trim()}
          isBusy={draft.isSaving}
          onConfirm={draft.confirmSave}
          onCancel={draft.cancelConfirmation}
        />
      ) : null}
    </>
  );
}
