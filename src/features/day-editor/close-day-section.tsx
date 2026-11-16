import { addDaysToDate } from "@/features/bookings/slots";
import { cn } from "@/lib/cn";

import type { EditorVariant } from "./day-editor-view";

export interface CloseDaySectionProps {
  /** The day the editor was opened for. */
  from: string;
  /** Last day the backend still has slots for. */
  editableTo: string;
  isMultiDay: boolean;
  onMultiDayChange: (isMultiDay: boolean) => void;
  until: string;
  onUntilChange: (date: string) => void;
  title: string;
  description: string;
  variant: EditorVariant;
}

const CAPTION = "text-[10px] font-semibold uppercase tracking-[0.2em] text-muted";

// Closing is for one day or for a stretch ("Varios días"): vacation, a long holiday.
export function CloseDaySection({
  from,
  editableTo,
  isMultiDay,
  onMultiDayChange,
  until,
  onUntilChange,
  title,
  description,
  variant,
}: CloseDaySectionProps) {
  const isMobile = variant === "mobile";

  function segment(isOn: boolean) {
    return cn(
      "text-[11px] font-semibold uppercase",
      isMobile ? "h-11 tracking-[0.15em]" : "px-3.5 py-2.5 whitespace-nowrap tracking-[0.15em]",
      isOn ? "bg-white text-black" : cn("bg-transparent", isMobile ? "text-[#bdbdbd]" : "text-muted"),
    );
  }

  const range = (
    <div
      role="radiogroup"
      aria-label="¿Cuántos días?"
      className={cn("overflow-hidden rounded border border-line", isMobile ? "grid grid-cols-2" : "flex shrink-0")}
    >
      <button type="button" role="radio" aria-checked={!isMultiDay} onClick={() => onMultiDayChange(false)} className={segment(!isMultiDay)}>
        Solo este día
      </button>
      <button
        type="button"
        role="radio"
        aria-checked={isMultiDay}
        onClick={() => onMultiDayChange(true)}
        className={cn(segment(isMultiDay), "border-l border-line")}
      >
        Varios días
      </button>
    </div>
  );

  const untilInput = (
    <label className={cn("flex flex-col gap-2", CAPTION)}>
      Hasta
      <input
        type="date"
        value={until}
        min={addDaysToDate(from, 1)}
        max={editableTo}
        onChange={(event) => onUntilChange(event.target.value)}
        className={cn(
          "rounded border border-line bg-soft px-3 tracking-normal text-white normal-case outline-none [color-scheme:dark] focus:border-white",
          isMobile ? "h-12 text-base" : "h-10 text-sm",
        )}
      />
    </label>
  );

  const outcome = (
    <>
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-1.5 text-[13px] leading-normal text-muted">{description}</p>
    </>
  );

  if (isMobile) {
    return (
      <section className="flex flex-col gap-4 pt-8">
        <div>
          <h2 className={CAPTION}>¿Cuántos días?</h2>
          <p className="mt-1.5 mb-3 text-[13px] text-muted">Para vacaciones o un feriado largo, elegí hasta qué día.</p>
          {range}
        </div>
        {isMultiDay ? untilInput : null}
        <div className="rounded border border-line bg-card p-4">{outcome}</div>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded border border-line bg-card">
      <div className="flex flex-wrap items-center justify-between gap-4 p-5">
        <div>
          <h2 className={CAPTION}>¿Cuántos días?</h2>
          <p className="mt-1.5 text-[13px] text-muted">Para vacaciones o un feriado largo, elegí hasta qué día.</p>
        </div>
        {range}
      </div>
      {isMultiDay ? (
        <div className="flex flex-wrap items-end gap-3 px-5 pb-5">
          <label className={cn("flex flex-col gap-2", CAPTION)}>
            Desde
            <input
              type="date"
              value={from}
              disabled
              className="h-10 rounded border border-line bg-soft px-3 text-sm tracking-normal text-muted normal-case [color-scheme:dark]"
            />
          </label>
          <span aria-hidden="true" className="flex h-10 items-center text-[#5a5a5a]">
            —
          </span>
          {untilInput}
        </div>
      ) : null}
      <div className="border-t border-line bg-soft px-5 py-4">{outcome}</div>
    </section>
  );
}
