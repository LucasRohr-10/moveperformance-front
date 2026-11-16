"use client";

import type { ServiceType } from "@/lib/api/types";
import { cn } from "@/lib/cn";

import { AddIndividualSlotForm } from "./add-individual-slot-form";
import type { NewSlotInput } from "./day-draft-model";
import type { EditorVariant } from "./day-editor-view";

export interface AddTurnoProps {
  service: ServiceType;
  professionals: { id: string; name: string }[];
  isAdding: boolean;
  onAddingChange: (isAdding: boolean) => void;
  onAdd: (slot: NewSlotInput) => void;
  variant: EditorVariant;
}

// Closed it is a text button under the list, like the row actions; open it is the individual-turno form.
export function AddTurno({ service, professionals, isAdding, onAddingChange, onAdd, variant }: AddTurnoProps) {
  if (isAdding) {
    return (
      <AddIndividualSlotForm
        service={service}
        professionals={professionals}
        onAdd={onAdd}
        onClose={() => onAddingChange(false)}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => onAddingChange(true)}
      className={cn(
        "self-start text-[10px] font-semibold uppercase tracking-[0.2em] text-muted hover:text-white",
        variant === "mobile" ? "h-11 underline decoration-[#4a4a4a] underline-offset-[5px]" : "border-b border-[#3a3a3a] py-1.5",
      )}
    >
      + Agregar turno individual
    </button>
  );
}
