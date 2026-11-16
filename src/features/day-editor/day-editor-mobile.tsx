"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { ROUTES } from "@/config/constants/routes.constants";
import { cn } from "@/lib/cn";

import { AddTurno } from "./add-turno";
import { ChangeSummary, ReasonField } from "./change-summary";
import { CloseDaySection } from "./close-day-section";
import type { DayEditorViewProps } from "./day-editor-view";
import { ModeOptions } from "./mode-options";
import { ServiceTabs } from "./service-tabs";
import { TurnoList } from "./turno-list";

const SECTION_TITLE = "mb-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted";

/** The phone's title block: a way back to Asistencias, the title and the day. The page's own header is desktop only. */
export function DayEditorMobileHeader({ dateLabel }: { dateLabel: string }) {
  return (
    <header className="md:hidden">
      <Link
        href={ROUTES.STAFF_SCHEDULE}
        className="-ml-3 flex h-11 w-max items-center gap-1.5 px-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#bdbdbd]"
      >
        <span aria-hidden="true" className="text-lg tracking-normal text-white">
          ‹
        </span>
        Asistencias
      </Link>
      <h1 className="mt-3 font-display text-[28px] leading-none font-black tracking-[-0.02em] uppercase">Editar día</h1>
      <p className="mt-2 text-sm text-muted">{dateLabel}</p>
    </header>
  );
}

interface SummarySheetProps extends DayEditorViewProps {
  onClose: () => void;
  onSaveFromSheet: () => void;
}

// The summary of changes as a sheet from the bottom: the phone has no room for the desktop's side column.
function SummarySheet(props: SummarySheetProps) {
  const { state, summary, canSave, isSaving, onClose } = props;
  const closeButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeButton.current?.focus();
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50">
      <div aria-hidden="true" onClick={onClose} className="absolute inset-0 bg-black/60" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Resumen de cambios"
        className="absolute inset-x-0 bottom-0 flex max-h-[75%] animate-sheet-in flex-col rounded-t-2xl border-t border-line bg-card"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-line py-2 pr-2 pl-5">
          <h2 className="text-[10px] font-semibold uppercase tracking-[0.25em] text-muted">Resumen de cambios</h2>
          <button ref={closeButton} type="button" aria-label="Cerrar" onClick={onClose} className="size-11 text-xl text-white">
            ×
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 pt-1 pb-4">
          <ChangeSummary groups={props.groups} emptyHint={props.emptyHint} variant="mobile" />
          {summary.needsReason ? (
            <ReasonField
              value={state.reason}
              error={props.reasonError}
              onChange={(reason) => props.dispatch({ type: "setReason", reason })}
            />
          ) : null}
        </div>
        <div className="flex shrink-0 gap-2.5 border-t border-line px-5 pt-3 pb-5">
          <button
            type="button"
            disabled={isSaving}
            onClick={() => {
              props.onDiscard();
              onClose();
            }}
            className="h-12 flex-1 rounded border border-line text-[11px] font-semibold uppercase tracking-[0.2em] text-white disabled:opacity-50"
          >
            Descartar
          </button>
          <SaveButton canSave={canSave} isSaving={isSaving} label={props.saveLabel} onClick={props.onSaveFromSheet} />
        </div>
      </div>
    </div>
  );
}

function SaveButton({ canSave, isSaving, label, onClick }: { canSave: boolean; isSaving: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      disabled={!canSave || isSaving}
      aria-busy={isSaving}
      onClick={onClick}
      className={cn(
        "h-12 flex-1 rounded text-[11px] font-semibold uppercase tracking-[0.2em] disabled:cursor-not-allowed",
        canSave ? "bg-white text-black" : "bg-[#1c1c1c] text-[#5a5a5a]",
      )}
    >
      {label}
    </button>
  );
}

// The phone layout: one column, the services pinned under the header, and save/review in a bar at the bottom.
export function DayEditorMobile(props: DayEditorViewProps) {
  const { editor, state, summary, mode, service, canSave, isSaving } = props;
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const closeSheet = useCallback(() => setIsSheetOpen(false), []);
  const isMissingReason = summary.needsReason && state.reason.trim() === "";

  function save() {
    // The reason lives in the sheet: with it missing, open the sheet so the error is where the field is.
    if (isMissingReason) setIsSheetOpen(true);
    else setIsSheetOpen(false);
    props.onSave();
  }

  return (
    <div data-testid="day-editor-mobile" className="md:hidden">
      <section className="pt-7">
        <h2 className={SECTION_TITLE}>¿Qué querés hacer?</h2>
        <ModeOptions mode={mode} onModeChange={props.onModeChange} variant="mobile" />
      </section>

      {mode === "edit" ? (
        <section className="pt-8">
          <h2 className={SECTION_TITLE}>Servicio</h2>
          <div className="sticky top-0 z-[4] -mx-5 border-b border-line bg-bg px-5">
            <ServiceTabs selected={service} onSelect={props.onServiceChange} variant="mobile" />
          </div>
          <TurnoList
            rows={props.rows}
            service={service}
            state={state}
            dispatch={props.dispatch}
            openKey={props.openKey}
            onOpenChange={props.onOpenChange}
            variant="mobile"
          />
          {editor.isRange ? null : (
            <div className="mt-4 flex flex-col">
              <AddTurno
                service={service}
                professionals={editor.professionals}
                isAdding={props.isAdding}
                onAddingChange={props.onAddingChange}
                onAdd={(slot) => props.dispatch({ type: "addSlot", slot })}
                variant="mobile"
              />
            </div>
          )}
        </section>
      ) : (
        <CloseDaySection
          from={editor.from}
          editableTo={editor.editableTo}
          isMultiDay={props.isMultiDay}
          onMultiDayChange={props.onMultiDayChange}
          until={props.until}
          onUntilChange={props.onUntilChange}
          title={props.closeTitle}
          description={props.closeDescription}
          variant="mobile"
        />
      )}

      <div className="sticky bottom-0 z-10 -mx-5 mt-8 flex gap-2.5 border-t border-line bg-bg px-5 pt-3 pb-5">
        <button
          type="button"
          aria-haspopup="dialog"
          onClick={() => setIsSheetOpen(true)}
          className="h-12 shrink-0 rounded border border-line px-[18px] text-[11px] font-semibold uppercase tracking-[0.2em] text-white"
        >
          Revisar
        </button>
        <SaveButton canSave={canSave} isSaving={isSaving} label={props.saveLabel} onClick={save} />
      </div>

      {isSheetOpen ? (
        <SummarySheet {...props} onClose={closeSheet} onSaveFromSheet={save} />
      ) : null}
    </div>
  );
}
