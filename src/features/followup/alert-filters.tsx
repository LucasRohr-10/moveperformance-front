"use client";

import { Button } from "@/components/ui/button";
import type { AlertCountsDto, AlertType } from "@/lib/api/types";
import { cn } from "@/lib/cn";

import { ALERT_LABELS, ALERT_ORDER, ALERT_TONE } from "./followup-labels";
import type { LoadState } from "./use-load-state";

const ALL_LABEL = "Todas";

const RISK_LABEL = "En riesgo";

// "type" is null for the two chips that are not one alert type: Todas and En riesgo.
interface Chip {
  key: string;
  type: AlertType | null;
  isRisk: boolean;
  text: string;
}

const TONE_BORDER_CLASSES: Record<"warning" | "danger" | "neutral", string> = {
  danger: "border-danger/30",
  warning: "border-warning/30",
  neutral: "border-line",
};

function getToneBorderClass(type: AlertType | null): string {
  if (type === null) return "border-line";
  return TONE_BORDER_CLASSES[ALERT_TONE[type]];
}

// Without the counters the chips still filter: they just do not say how many there are.
function chipsFor(counts: LoadState<AlertCountsDto>): Chip[] {
  const withCount = (label: string, count: (data: AlertCountsDto) => number): string =>
    typeof counts === "object" ? `${label} · ${count(counts.data)}` : label;
  return [
    { key: ALL_LABEL, type: null, isRisk: false, text: withCount(ALL_LABEL, (data) => data.total) },
    // No counter: the counters count alerts, and the dashboard counts the clients at risk.
    { key: RISK_LABEL, type: null, isRisk: true, text: RISK_LABEL },
    ...ALERT_ORDER.map((type) => ({
      key: type,
      type,
      isRisk: false,
      text: withCount(ALERT_LABELS[type], (data) => data[type]),
    })),
  ];
}

export function AlertFilters({
  selected,
  isRiskSelected,
  counts,
  onSelect,
  onSelectRisk,
  onRetryCounts,
}: {
  selected: AlertType | null;
  isRiskSelected: boolean;
  counts: LoadState<AlertCountsDto>;
  onSelect: (type: AlertType | null) => void;
  onSelectRisk: () => void;
  onRetryCounts: () => void;
}) {
  return (
    <div>
      <div role="group" aria-label="Filtrar alertas" className="flex flex-wrap gap-2">
        {chipsFor(counts).map(({ key, type, isRisk, text }) => {
          const isSelected = isRisk ? isRiskSelected : !isRiskSelected && type === selected;
          return (
            <button
              key={key}
              type="button"
              aria-pressed={isSelected}
              onClick={() => (isRisk ? onSelectRisk() : onSelect(type))}
              className={cn(
                "min-h-11 rounded border px-3 text-xs font-medium transition-colors sm:min-h-0 sm:py-1.5",
                isSelected ? "border-white bg-white text-black" : cn(getToneBorderClass(type), "text-muted hover:text-white"),
              )}
            >
              {text}
            </button>
          );
        })}
      </div>
      {counts === "error" ? (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <p role="alert" className="text-xs text-danger">
            No pudimos cargar los contadores.
          </p>
          <Button type="button" variant="secondary" size="sm" onClick={onRetryCounts} touchTarget>
            Reintentar contadores
          </Button>
        </div>
      ) : null}
    </div>
  );
}
