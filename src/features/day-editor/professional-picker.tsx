import { formatSlotTime } from "@/features/bookings/slots";
import type { DayBusyProfessionalDto, DayEditorSlotDto } from "@/lib/api/types";
import { Select } from "@/components/ui/select";

export interface ProfessionalPickerProps {
  professionals: { id: string; name: string }[];
  busyProfessionals: DayBusyProfessionalDto[];
  /** The band's own slots: someone busy only because of them is not busy. */
  slots: DayEditorSlotDto[];
  value: string | null;
  /** Who the template assigns, to mark that option "como en la plantilla". */
  templateProfessionalId: string | null;
  /** Rehab: a professional is mandatory. */
  required?: boolean;
  onChange: (professionalId: string | null) => void;
}

function busyWindow(
  professionalId: string,
  busy: DayBusyProfessionalDto[],
  slots: DayEditorSlotDto[],
): DayBusyProfessionalDto | null {
  const ownIds = new Set(slots.map((slot) => slot.id));
  const windows = slots
    .filter((slot) => slot.state !== "cancelled")
    .map((slot) => ({ start: Date.parse(slot.startsAt), end: Date.parse(slot.endsAt) }));
  return (
    busy.find(
      (entry) =>
        entry.professionalId === professionalId &&
        !ownIds.has(entry.slotId) &&
        windows.some(
          (window) => Date.parse(entry.startsAt) < window.end && window.start < Date.parse(entry.endsAt),
        ),
    ) ?? null
  );
}

// The app's own dropdown. Someone busy at the same time is listed but cannot be picked.
export function ProfessionalPicker({
  professionals,
  busyProfessionals,
  slots,
  value,
  templateProfessionalId,
  required = false,
  onChange,
}: ProfessionalPickerProps) {
  const options = [
    ...(required ? [] : [{ id: "", label: "Sin profesional", note: null as string | null, disabled: false }]),
    ...professionals.map((professional) => {
      const conflict = busyWindow(professional.id, busyProfessionals, slots);
      return {
        id: professional.id,
        label: professional.name,
        note: conflict ? `ocupado ${formatSlotTime(conflict.startsAt)}–${formatSlotTime(conflict.endsAt)}` : null,
        disabled: conflict !== null && professional.id !== value,
      };
    }),
  ].map((option) => ({
    ...option,
    note: option.note ?? (option.id === templateProfessionalId ? "como en la plantilla" : null),
  }));

  return (
    <Select
      label="Profesional"
      value={value ?? ""}
      onChange={(event) => onChange(event.target.value === "" ? null : event.target.value)}
    >
      {options.map((option) => (
        <option key={option.id} value={option.id} disabled={option.disabled}>
          {option.note ? `${option.label} · ${option.note}` : option.label}
        </option>
      ))}
    </Select>
  );
}
