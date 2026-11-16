"use client";

import { type FormEvent, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { Professional, ScheduleTemplate, ServiceType, TemplateDay } from "@/lib/api/types";

import type { DaySuggestions } from "./template-form-model";
import type { TemplateInput } from "./templates-api";
import { WeekdayHoursField } from "./weekday-hours-field";

const DEFAULT_DURATION_MINUTES = 60;
const DEFAULT_GAP_MINUTES = 5;

const NO_DAYS_ERROR = "Elegí al menos un día";
const MISSING_TIME_ERROR = "Completá la hora";
const DURATION_ERROR = "La duración tiene que ser de al menos 1 minuto.";
const CAPACITY_ERROR = "El cupo tiene que ser al menos 1.";
const REHAB_PROFESSIONAL_ERROR = "Rehab necesita un profesional asignado.";

export interface TemplateFormProps {
  /** Present when editing; absent when creating. */
  initial?: ScheduleTemplate;
  professionals: Professional[];
  isSubmitting: boolean;
  /** May answer with the end times the backend suggests for the days that don't close exactly. */
  onSubmit: (input: TemplateInput) => void | Promise<DaySuggestions | undefined>;
  /** Called with the reasons when the form can't be sent, so the panel can show them. */
  onInvalid: (messages: string[]) => void;
  onCancel: () => void;
}

export function TemplateForm({
  initial,
  professionals,
  isSubmitting,
  onSubmit,
  onInvalid,
  onCancel,
}: TemplateFormProps) {
  const isEditing = initial !== undefined;
  const [days, setDays] = useState<TemplateDay[]>(initial?.days ?? []);
  const [daysError, setDaysError] = useState<string | null>(null);
  const [dayErrors, setDayErrors] = useState<Partial<Record<number, string>>>({});
  const [daySuggestions, setDaySuggestions] = useState<DaySuggestions>({});
  const formRef = useRef<HTMLFormElement>(null);
  // Focus goes to the first flagged day only when a save brings the help, never while the staff is fixing it.
  const shouldFocusFlaggedDay = useRef(false);

  useEffect(() => {
    formRef.current?.querySelector<HTMLElement>("select:not([disabled])")?.focus();
  }, []);

  useEffect(() => {
    if (!shouldFocusFlaggedDay.current) return;
    shouldFocusFlaggedDay.current = false;
    formRef.current?.querySelector<HTMLElement>('[aria-label^="Fin del"][aria-invalid="true"]')?.focus();
  }, [daySuggestions]);

  function handleDaysChange(next: TemplateDay[]) {
    const sameDays = next.length === days.length && next.every((day, index) => day.weekday === days[index].weekday);
    setDays(next);
    setDaysError(null);
    setDayErrors({});
    // Fixing a time is handled by the field, which only drops that day's help.
    if (!sameDays) setDaySuggestions({});
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (days.length === 0) {
      setDaysError(NO_DAYS_ERROR);
      return;
    }
    const missingTime = days.filter((day) => !day.startTime || !day.endTime);
    if (missingTime.length > 0) {
      setDayErrors(Object.fromEntries(missingTime.map((day) => [day.weekday, MISSING_TIME_ERROR])));
      return;
    }

    const form = new FormData(event.currentTarget);
    const service = initial?.service ?? (form.get("service") as ServiceType);
    const professionalId = String(form.get("professionalId") ?? "");
    const durationMinutes = Number(form.get("durationMinutes"));
    const capacity = Number(form.get("capacity"));

    const problems = [
      !(durationMinutes >= 1) && DURATION_ERROR,
      !(capacity >= 1) && CAPACITY_ERROR,
      service === "rehab" && !professionalId && REHAB_PROFESSIONAL_ERROR,
    ].filter((problem): problem is string => problem !== false);
    if (problems.length > 0) {
      onInvalid(problems);
      return;
    }

    const suggestions = await onSubmit({
      service,
      days,
      durationMinutes,
      gapMinutes: Number(form.get("gapMinutes")),
      capacity,
      professionalId: professionalId || null,
    });
    shouldFocusFlaggedDay.current = Object.keys(suggestions ?? {}).length > 0;
    setDaySuggestions(suggestions ?? {});
  }

  return (
    <form
      ref={formRef}
      id="new-template-form"
      noValidate
      onSubmit={handleSubmit}
      aria-label={isEditing ? "Editar plantilla" : "Nueva plantilla"}
      className="space-y-4"
    >
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
        <Select
          label="Servicio"
          name="service"
          required
          disabled={isEditing}
          defaultValue={initial?.service ?? "performance"}
        >
          <option value="performance">Performance</option>
          <option value="rehab">Rehab</option>
          <option value="recovery">Recovery</option>
        </Select>
        <Select
          label="Profesional"
          name="professionalId"
          defaultValue={initial?.professionalId ?? ""}
        >
          <option value="">Sin profesional</option>
          {professionals.map((professional) => (
            <option key={professional.id} value={professional.id}>
              {professional.name}
            </option>
          ))}
        </Select>
        <Input
          label="Duración (min)"
          name="durationMinutes"
          type="number"
          min={1}
          step={5}
          required
          defaultValue={initial?.durationMinutes ?? DEFAULT_DURATION_MINUTES}
        />
        <Input
          label="Margen entre turnos (min)"
          name="gapMinutes"
          type="number"
          min={0}
          step={5}
          required
          defaultValue={initial?.gapMinutes ?? DEFAULT_GAP_MINUTES}
        />
        <Input
          label="Cupo"
          name="capacity"
          type="number"
          min={1}
          required
          defaultValue={initial?.capacity}
        />
      </div>

      <div>
        <WeekdayHoursField
          value={days}
          onChange={handleDaysChange}
          errors={dayErrors}
          suggestions={daySuggestions}
          onSuggestionsChange={setDaySuggestions}
        />
        {daysError ? (
          <p role="alert" className="mt-1.5 text-xs text-danger">
            {daysError}
          </p>
        ) : null}
      </div>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="secondary" touchTarget onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" touchTarget disabled={isSubmitting}>
          {isEditing ? "Guardar" : "Crear"}
        </Button>
      </div>
    </form>
  );
}
