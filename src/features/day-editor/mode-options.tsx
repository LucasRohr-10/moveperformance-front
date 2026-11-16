import { cn } from "@/lib/cn";

import type { EditorMode, EditorVariant } from "./day-editor-view";

const MODES: { mode: EditorMode; title: string; description: string }[] = [
  { mode: "edit", title: "Modificar turnos", description: "Cancelá turnos o cambiá el cupo y el profesional." },
  { mode: "close", title: "Cerrar el día", description: "Feriado, vacaciones o cierre. Se cancelan todos los turnos." },
];

export interface ModeOptionsProps {
  mode: EditorMode;
  onModeChange: (mode: EditorMode) => void;
  variant: EditorVariant;
}

// "What do you want to do?": two cards, one selected.
export function ModeOptions({ mode, onModeChange, variant }: ModeOptionsProps) {
  const isMobile = variant === "mobile";

  return (
    <div
      role="radiogroup"
      aria-label="¿Qué querés hacer?"
      className={isMobile ? "flex flex-col gap-2.5" : "grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3"}
    >
      {MODES.map((option) => {
        const isSelected = option.mode === mode;
        return (
          <button
            key={option.mode}
            type="button"
            role="radio"
            aria-checked={isSelected}
            onClick={() => onModeChange(option.mode)}
            className={cn(
              "flex items-start gap-3.5 rounded border px-5 py-[18px] text-left",
              isSelected ? "border-white bg-raised" : "border-line bg-soft",
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                "mt-0.5 size-4 shrink-0 rounded-full",
                isSelected ? "border-[5px] border-white" : "border-[1.5px] border-[#4a4a4a]",
              )}
            />
            <span className={cn("flex flex-col", isMobile ? "gap-1" : "gap-1.5")}>
              <span className="text-[15px] font-semibold text-white">{option.title}</span>
              <span className={cn("text-[13px] text-muted", isMobile ? "leading-[1.45]" : "leading-normal")}>
                {option.description}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
