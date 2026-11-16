import { cn } from "@/lib/cn";

import type { EditorVariant } from "./day-editor-view";
import { pluralize } from "./plural";

export const MAX_CAPACITY = 100;

export interface CapacityStepperProps {
  value: number;
  /** The fullest active slot of the band: the capacity cannot go under what it already holds. */
  fullest: { booked: number; time: string } | null;
  onChange: (value: number) => void;
  variant?: EditorVariant;
}

export function CapacityStepper({ value, fullest, onChange, variant = "desktop" }: CapacityStepperProps) {
  const min = Math.max(1, fullest?.booked ?? 0);
  const isMobile = variant === "mobile";
  const stepClass = cn(
    "h-full bg-bg text-white disabled:cursor-not-allowed disabled:opacity-40",
    isMobile ? "w-12 text-lg" : "w-10 text-base enabled:hover:bg-raised",
  );

  return (
    <div className="flex flex-col gap-2.5">
      <div className={cn("flex w-max items-center overflow-hidden rounded border border-line", isMobile ? "h-11" : "h-10")}>
        <button type="button" aria-label="Menos cupo" disabled={value <= min} onClick={() => onChange(value - 1)} className={stepClass}>
          −
        </button>
        <span
          aria-live="polite"
          className={cn(
            "border-x border-line text-center font-semibold tabular-nums",
            isMobile ? "w-[52px] text-[15px] leading-[42px]" : "w-11 text-sm leading-[38px]",
          )}
        >
          {value}
        </span>
        <button type="button" aria-label="Más cupo" disabled={value >= MAX_CAPACITY} onClick={() => onChange(value + 1)} className={stepClass}>
          +
        </button>
      </div>
      {fullest && fullest.booked >= 1 ? (
        <div className="text-[11px] leading-relaxed text-muted">
          <p>
            No puede bajar de {min}, porque el turno de las {fullest.time} ya tiene{" "}
            {pluralize(fullest.booked, "reserva", "reservas")}.
          </p>
          <p>Para bajarlo más, primero cancelá ese turno.</p>
        </div>
      ) : null}
    </div>
  );
}
