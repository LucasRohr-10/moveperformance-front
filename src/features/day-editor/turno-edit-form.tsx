"use client";

import { formatSlotTime } from "@/features/bookings/slots";
import type { DayBandDto, DayEditorSlotDto, ServiceType } from "@/lib/api/types";
import { cn } from "@/lib/cn";

import { CapacityStepper } from "./capacity-stepper";
import { slotValues, type DayDraftState, type DraftAction } from "./day-draft-model";
import type { EditorVariant } from "./day-editor-view";
import { ProfessionalPicker } from "./professional-picker";

export interface TurnoEditFormProps {
  /** The franja the turno belongs to: it says who the template assigns and which service this is. */
  band: DayBandDto;
  slot: DayEditorSlotDto;
  service: ServiceType;
  state: DayDraftState;
  dispatch: (action: DraftAction) => void;
  variant: EditorVariant;
  onDone: () => void;
}

// Same as the label of the app's `Select`, so Profesional and Cupo read as one form.
const CAPTION = "text-xs font-medium text-muted";

// Opens under a turno and edits that turno only. Every change goes straight into the draft; "Listo" only closes the panel.
export function TurnoEditForm({ band, slot, service, state, dispatch, variant, onDone }: TurnoEditFormProps) {
  const { editor } = state;
  const values = slotValues(state, slot);
  const isMobile = variant === "mobile";
  const isRehab = service === "rehab";

  const textButton = cn(
    "text-[10px] font-semibold uppercase tracking-[0.2em] text-muted",
    isMobile ? "h-11 underline underline-offset-[5px]" : "border-b border-[#3a3a3a] py-1.5",
  );

  return (
    <div
      className={cn(
        isMobile
          ? "flex flex-col gap-4 pt-1 pb-5 pl-[68px]"
          : "flex flex-wrap items-end gap-x-5 gap-y-4 pt-1 pr-5 pb-[18px] pl-[88px]",
      )}
    >
      <div className={isMobile ? "" : "flex-[1_1_180px]"}>
        <ProfessionalPicker
          professionals={editor.professionals}
          busyProfessionals={editor.busyProfessionals}
          slots={[slot]}
          value={values.professionalId}
          templateProfessionalId={band.template.professionalId}
          required={isRehab}
          onChange={(professionalId) => dispatch({ type: "setSlotProfessional", slotId: slot.id, professionalId })}
        />
      </div>

      {isRehab ? null : (
        <div role="group" aria-label="Cupo" className="flex flex-col gap-2">
          <span className={CAPTION}>Cupo</span>
          <CapacityStepper
            value={values.capacity}
            fullest={slot.booked > 0 ? { booked: slot.booked, time: formatSlotTime(slot.startsAt) } : null}
            onChange={(capacity) => dispatch({ type: "setSlotCapacity", slotId: slot.id, capacity })}
            variant={variant}
          />
        </div>
      )}

      <div className={cn("flex basis-full flex-wrap items-center", isMobile ? "gap-5" : "gap-4 pt-1")}>
        <button
          type="button"
          onClick={onDone}
          className={cn(
            "rounded bg-white font-semibold text-black uppercase tracking-[0.2em]",
            isMobile ? "h-11 px-5 text-[11px]" : "h-9 px-4 text-[10px]",
          )}
        >
          Listo
        </button>
        {state.slotEdits[slot.id] ? (
          <button type="button" onClick={() => dispatch({ type: "resetSlot", slotId: slot.id })} className={textButton}>
            Deshacer cambios
          </button>
        ) : null}
      </div>
    </div>
  );
}
