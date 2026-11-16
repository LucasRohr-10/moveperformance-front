"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { TemplateDay } from "@/lib/api/types";
import { cn } from "@/lib/cn";

import { commonSuggestions, DEFAULT_DAY_HOURS, type DaySuggestions, WEEKDAY_LABELS, withoutDay } from "./template-form-model";

export interface WeekdayHoursFieldProps {
  value: TemplateDay[];
  onChange: (days: TemplateDay[]) => void;
  /** Error message per weekday, shown under that day's row. */
  errors?: Partial<Record<number, string>>;
  /** End times the backend would accept for each day that doesn't close exactly; shown as buttons on that day. */
  suggestions?: DaySuggestions;
  onSuggestionsChange?: (next: DaySuggestions) => void;
}

const SUGGESTION_BUTTON_CLASS = "rounded-sm bg-warning px-2 py-1 text-[11px] font-semibold text-black";
const NO_SUGGESTIONS: DaySuggestions = {};

export function WeekdayHoursField({
  value,
  onChange,
  errors = {},
  suggestions = NO_SUGGESTIONS,
  onSuggestionsChange = () => undefined,
}: WeekdayHoursFieldProps) {
  function toggle(weekday: number) {
    if (value.some((day) => day.weekday === weekday)) {
      onChange(value.filter((day) => day.weekday !== weekday));
      return;
    }
    const added = { weekday, ...DEFAULT_DAY_HOURS };
    onChange([...value, added].sort((a, b) => a.weekday - b.weekday));
  }

  function setTime(weekday: number, field: "startTime" | "endTime", time: string) {
    onChange(value.map((day) => (day.weekday === weekday ? { ...day, [field]: time } : day)));
    if (field === "endTime") onSuggestionsChange(withoutDay(suggestions, weekday));
  }

  function applyToFlaggedDays(time: string) {
    onChange(value.map((day) => (suggestions[day.weekday] ? { ...day, endTime: time } : day)));
    onSuggestionsChange({});
  }

  const flaggedCount = Object.keys(suggestions).length;

  return (
    <div className="space-y-3">
      <div
        role="group"
        aria-label="Días habilitados"
        className="flex gap-2 overflow-x-auto pb-1"
      >
        {WEEKDAY_LABELS.map(({ weekday, short, name }) => {
          const isChecked = value.some((day) => day.weekday === weekday);
          return (
            <button
              key={weekday}
              type="button"
              aria-pressed={isChecked}
              aria-label={name}
              onClick={() => toggle(weekday)}
              className={cn(
                "inline-flex size-11 shrink-0 items-center justify-center rounded border text-sm font-medium transition-colors",
                isChecked
                  ? "border-white bg-white text-bg"
                  : "border-line-strong bg-soft text-muted hover:text-white",
              )}
            >
              {short}
            </button>
          );
        })}
      </div>

      {value.map((day) => {
        const name = WEEKDAY_LABELS.find((item) => item.weekday === day.weekday)?.name ?? "";
        const lowerName = name.toLowerCase();
        const error = errors[day.weekday];
        const daySuggestions = suggestions[day.weekday];
        return (
          <div key={day.weekday}>
            <p className="mb-1 text-sm font-medium">{name}</p>
            <div className="grid grid-cols-2 gap-4">
              <Input
                aria-label={`Inicio del ${lowerName}`}
                type="time"
                step={300}
                value={day.startTime}
                aria-invalid={Boolean(error)}
                onChange={(event) => setTime(day.weekday, "startTime", event.target.value)}
              />
              <Input
                aria-label={`Fin del ${lowerName}`}
                type="time"
                step={300}
                value={day.endTime}
                aria-invalid={Boolean(error) || Boolean(daySuggestions)}
                className={daySuggestions ? "border-warning" : undefined}
                onChange={(event) => setTime(day.weekday, "endTime", event.target.value)}
              />
            </div>
            {daySuggestions ? (
              <p className="mt-1.5 flex flex-wrap items-center justify-end gap-x-1.5 gap-y-1 text-xs text-warning">
                <span>Terminá a las</span>
                {daySuggestions.map((time, index) => (
                  <span key={time} className="inline-flex items-center gap-1.5">
                    {index > 0 ? <span>o</span> : null}
                    <button
                      type="button"
                      aria-label={`Terminar el ${lowerName} a las ${time}`}
                      className={SUGGESTION_BUTTON_CLASS}
                      onClick={() => setTime(day.weekday, "endTime", time)}
                    >
                      {time}
                    </button>
                  </span>
                ))}
              </p>
            ) : null}
            {error ? (
              <p role="alert" className="mt-1.5 text-xs text-danger">
                {error}
              </p>
            ) : null}
          </div>
        );
      })}

      {commonSuggestions(suggestions).length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {commonSuggestions(suggestions).map((time) => (
            <Button key={time} type="button" variant="secondary" size="sm" touchTarget onClick={() => applyToFlaggedDays(time)}>
              {`Usar ${time} en los ${flaggedCount} días`}
            </Button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
