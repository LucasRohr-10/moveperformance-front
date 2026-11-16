import type { FrequencyType } from "@/lib/api/types";

const FREQUENCY_LABELS: Record<FrequencyType, (frequency: number) => string> = {
  months: (frequency) => (frequency === 1 ? "cada mes" : `cada ${frequency} meses`),
  days: (frequency) => `cada ${frequency} días`,
};

export function frequencyLabel(frequency: number, type: FrequencyType): string {
  return FREQUENCY_LABELS[type](frequency);
}
