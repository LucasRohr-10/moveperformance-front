"use client";

import { cn } from "@/lib/cn";

import { AddTurno } from "./add-turno";
import { ChangeSummary, ReasonField } from "./change-summary";
import { CloseDaySection } from "./close-day-section";
import type { DayEditorViewProps } from "./day-editor-view";
import { ModeOptions } from "./mode-options";
import { ServiceTabs } from "./service-tabs";
import { TurnoList } from "./turno-list";

const SECTION_TITLE = "mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted";

// The desktop layout: the choices and the turnos on the left, the summary of changes pinned on the right.
export function DayEditorDesktop(props: DayEditorViewProps) {
  const { editor, state, summary, mode, service, canSave, isSaving } = props;

  return (
    <div data-testid="day-editor-desktop" className="hidden flex-wrap items-start gap-6 md:flex">
      <div className="flex min-w-0 flex-[1_1_300px] flex-col gap-8">
        <section>
          <h2 className={SECTION_TITLE}>¿Qué querés hacer?</h2>
          <ModeOptions mode={mode} onModeChange={props.onModeChange} variant="desktop" />
        </section>

        {mode === "edit" ? (
          <section className="flex flex-col gap-5">
            <div>
              <h2 className={SECTION_TITLE}>Servicio</h2>
              <ServiceTabs selected={service} onSelect={props.onServiceChange} variant="desktop" />
            </div>
            <TurnoList
              rows={props.rows}
              service={service}
              state={state}
              dispatch={props.dispatch}
              openKey={props.openKey}
              onOpenChange={props.onOpenChange}
              variant="desktop"
            />
            {editor.isRange ? null : (
              <AddTurno
                service={service}
                professionals={editor.professionals}
                isAdding={props.isAdding}
                onAddingChange={props.onAddingChange}
                onAdd={(slot) => props.dispatch({ type: "addSlot", slot })}
                variant="desktop"
              />
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
            variant="desktop"
          />
        )}
      </div>

      <aside className="sticky top-6 flex-[0_0_260px] overflow-hidden rounded border border-line bg-card">
        <h2 className="border-b border-line px-5 py-4 text-[10px] font-semibold uppercase tracking-[0.25em] text-muted">
          Resumen de cambios
        </h2>
        <div className="px-5 pt-1 pb-3.5">
          <ChangeSummary groups={props.groups} emptyHint={props.emptyHint} variant="desktop" />
          {summary.needsReason ? (
            <ReasonField
              value={state.reason}
              error={props.reasonError}
              onChange={(reason) => props.dispatch({ type: "setReason", reason })}
            />
          ) : null}
        </div>
        <div className="flex flex-col gap-2 border-t border-line px-5 py-4">
          <button
            type="button"
            disabled={!canSave || isSaving}
            aria-busy={isSaving}
            onClick={props.onSave}
            className={cn(
              "h-11 rounded text-[11px] font-semibold uppercase tracking-[0.2em]",
              canSave ? "bg-white text-black" : "bg-[#1c1c1c] text-[#5a5a5a]",
              "disabled:cursor-not-allowed",
            )}
          >
            {props.saveLabel}
          </button>
          <button
            type="button"
            disabled={isSaving}
            onClick={props.onDiscard}
            className="h-10 rounded border border-line text-[10px] font-semibold uppercase tracking-[0.2em] text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            Descartar
          </button>
        </div>
      </aside>
    </div>
  );
}
