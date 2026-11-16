"use client";

import type { ServiceType } from "@/lib/api/types";
import { cn } from "@/lib/cn";

import { SERVICE_LABELS } from "./band-labels";
import type { DayDraftState, DraftAction } from "./day-draft-model";
import { isStruck, type StatusTone, type TurnoAction, type TurnoRow } from "./day-editor-model";
import type { EditorVariant } from "./day-editor-view";
import { TurnoEditForm } from "./turno-edit-form";

const STATUS_COLOR: Record<StatusTone, string> = {
  danger: "text-danger",
  strong: "text-white",
  normal: "text-[#bdbdbd]",
};

export interface TurnoListProps {
  rows: TurnoRow[];
  service: ServiceType;
  state: DayDraftState;
  dispatch: (action: DraftAction) => void;
  openKey: string | null;
  onOpenChange: (key: string | null) => void;
  variant: EditorVariant;
}

interface TurnoItemProps extends Omit<TurnoListProps, "rows"> {
  row: TurnoRow;
  isFirst: boolean;
}

function TurnoItem({ row, isFirst, service, state, dispatch, openKey, onOpenChange, variant }: TurnoItemProps) {
  const isMobile = variant === "mobile";
  const isStarted = row.state === "started";
  const struck = isStruck(row);
  const band = row.bandId
    ? state.editor.services.find((entry) => entry.service === service)?.bands.find((candidate) => candidate.templateId === row.bandId)
    : undefined;
  // A row that can be edited is an active franja slot, and its key is the slot's id.
  const slot = band?.slots.find((candidate) => candidate.id === row.key);
  const isOpen = openKey === row.key && row.canEdit && band !== undefined && slot !== undefined;
  const showEdit = row.canEdit && !isOpen;
  const showAction = row.action !== null && !isOpen;

  const buttonClass = cn(
    "text-[10px] font-semibold uppercase tracking-[0.2em]",
    isMobile ? "h-9 underline underline-offset-[5px]" : "border-b py-1.5",
  );

  return (
    <div
      className={cn(
        !isFirst && "border-t border-[#1c1c1c]",
        isOpen ? "bg-[#181818]" : struck && "bg-soft",
        row.isEdited && !struck && "shadow-[inset_2px_0_0_#fff]",
        isMobile && "-mx-5 px-5",
      )}
    >
      <div
        className={cn(
          "grid grid-cols-[56px_minmax(0,1fr)] items-center gap-x-3",
          isMobile ? "min-h-[72px] gap-y-2.5 py-3.5" : "min-h-[60px] gap-y-2 px-5 py-2.5",
          isStarted && "opacity-45",
        )}
      >
        <span className={cn("text-[15px] font-semibold tabular-nums", struck ? "text-[#7a7a7a] line-through" : "text-white")}>
          {row.time}
        </span>
        <span className="flex min-w-0 flex-col gap-[3px]">
          <span className={cn("truncate text-[13px]", STATUS_COLOR[row.statusTone])}>{row.statusText}</span>
          <span className="truncate text-xs text-[#7a7a7a]">{row.detail}</span>
        </span>
        {showEdit || showAction ? (
          <span className={cn("col-start-2 flex items-center", isMobile ? "gap-6" : "flex-wrap gap-5")}>
            {showEdit ? (
              <button
                type="button"
                aria-label={`Editar ${row.time}`}
                aria-expanded={false}
                onClick={() => onOpenChange(row.key)}
                className={cn(buttonClass, "text-muted", isMobile ? "decoration-[#4a4a4a]" : "border-[#3a3a3a]")}
              >
                Editar
              </button>
            ) : null}
            {showAction && row.action ? (
              <ActionButton row={row} action={row.action} className={buttonClass} dispatch={dispatch} isMobile={isMobile} />
            ) : null}
          </span>
        ) : null}
      </div>
      {isOpen && band && slot ? (
        <TurnoEditForm
          band={band}
          slot={slot}
          service={service}
          state={state}
          dispatch={dispatch}
          variant={variant}
          onDone={() => onOpenChange(null)}
        />
      ) : null}
    </div>
  );
}

interface ActionButtonProps {
  row: TurnoRow;
  action: TurnoAction;
  className: string;
  dispatch: (action: DraftAction) => void;
  isMobile: boolean;
}

function ActionButton({ row, action, className, dispatch, isMobile }: ActionButtonProps) {
  const color = action.isDanger
    ? cn("text-danger", !isMobile && "border-danger/40")
    : cn("text-white", !isMobile && "border-white");
  return (
    <button
      type="button"
      aria-label={`${action.label} ${row.time}`}
      onClick={() => dispatch(action.draftAction)}
      className={cn(className, "whitespace-nowrap", color)}
    >
      {action.label}
    </button>
  );
}

export function TurnoList({ rows, ...rest }: TurnoListProps) {
  const isMobile = rest.variant === "mobile";

  if (rows.length === 0) {
    return <p className="px-5 py-6 text-sm text-muted">No hay turnos de {SERVICE_LABELS[rest.service]} ese día.</p>;
  }

  return (
    <div
      role="tabpanel"
      aria-label={SERVICE_LABELS[rest.service]}
      className={cn(!isMobile && "overflow-hidden rounded border border-line bg-card")}
    >
      {rows.map((row, index) => (
        <TurnoItem key={row.key} row={row} isFirst={index === 0} {...rest} />
      ))}
    </div>
  );
}
