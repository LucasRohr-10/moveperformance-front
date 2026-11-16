"use client";

import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { ServiceType } from "@/lib/api/types";

import { SERVICE_LABELS } from "./band-labels";
import type { NewSlotInput } from "./day-draft-model";
import { toTime } from "./expand-day-starts";

const MIN_DURATION = 5;
const MAX_DURATION = 480;
const MAX_CAPACITY = 100;
const MINUTES_PER_DAY = 24 * 60;

export interface AddIndividualSlotFormProps {
  /** The service of the open tab. */
  service: ServiceType;
  professionals: { id: string; name: string }[];
  onAdd: (slot: NewSlotInput) => void;
  onClose: () => void;
}

interface FormErrors {
  startTime?: string;
  duration?: string;
  capacity?: string;
  professional?: string;
}

function startMinutes(startTime: string): number | null {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(startTime)) return null;
  const [hours, minutes] = startTime.split(":").map(Number);
  return hours * 60 + minutes;
}

export function AddIndividualSlotForm({ service, professionals, onAdd, onClose }: AddIndividualSlotFormProps) {
  const isRehab = service === "rehab";
  const [startTime, setStartTime] = useState("");
  const [duration, setDuration] = useState("60");
  const [capacity, setCapacity] = useState("1");
  const [professionalId, setProfessionalId] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const start = startMinutes(startTime);
  const durationValue = Number(duration);
  const capacityValue = isRehab ? 1 : Number(capacity);
  const isDurationValid = Number.isInteger(durationValue) && durationValue >= MIN_DURATION && durationValue <= MAX_DURATION;
  const endsToday = start !== null && isDurationValid && start + durationValue <= MINUTES_PER_DAY;

  const errors: FormErrors = {
    ...(start === null ? { startTime: "Elegí la hora de inicio." } : {}),
    ...(!isDurationValid
      ? { duration: `La duración va de ${MIN_DURATION} a ${MAX_DURATION} minutos.` }
      : start !== null && !endsToday
        ? { duration: "El turno tiene que terminar antes de medianoche." }
        : {}),
    ...(!Number.isInteger(capacityValue) || capacityValue < 1 || capacityValue > MAX_CAPACITY
      ? { capacity: `El cupo va de 1 a ${MAX_CAPACITY}.` }
      : {}),
    ...(isRehab && professionalId === "" ? { professional: "Elegí un profesional." } : {}),
  };
  const shown = submitted ? errors : {};

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitted(true);
    if (Object.keys(errors).length > 0) return;
    onAdd({
      service,
      startTime,
      durationMinutes: durationValue,
      capacity: capacityValue,
      professionalId: professionalId === "" ? null : professionalId,
    });
    onClose();
  }

  return (
    <form
      noValidate
      onSubmit={handleSubmit}
      className="flex flex-col gap-3.5 rounded border border-white bg-card p-5"
    >
      <div className="flex items-center justify-between gap-3">
        <h4 className="text-base font-semibold">Nuevo turno individual · {SERVICE_LABELS[service]}</h4>
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>
          Cerrar
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <Input label="Hora de inicio" type="time" value={startTime} error={shown.startTime} onChange={(event) => setStartTime(event.target.value)} />
        <Input
          label="Duración (min)"
          type="number"
          inputMode="numeric"
          value={duration}
          error={shown.duration}
          onChange={(event) => setDuration(event.target.value)}
        />
        <Input
          label="Cupo"
          type="number"
          inputMode="numeric"
          value={isRehab ? "1" : capacity}
          disabled={isRehab}
          error={shown.capacity}
          onChange={(event) => setCapacity(event.target.value)}
        />
        <Select
          label="Profesional"
          value={professionalId}
          error={shown.professional}
          onChange={(event) => setProfessionalId(event.target.value)}
        >
          <option value="">{isRehab ? "Elegí un profesional" : "Sin profesional"}</option>
          {professionals.map((professional) => (
            <option key={professional.id} value={professional.id}>
              {professional.name}
            </option>
          ))}
        </Select>
      </div>
      <div className="flex flex-col gap-1 text-[11px] leading-relaxed text-muted">
        {endsToday && start !== null ? <p>Termina {toTime(start + durationValue)}.</p> : null}
        <p>Rehab exige un profesional y cupo 1, igual que en las plantillas.</p>
      </div>
      <div className="flex justify-end">
        <Button type="submit">Agregar</Button>
      </div>
    </form>
  );
}
