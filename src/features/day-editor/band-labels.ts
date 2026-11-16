import type { DayBandDto, ServiceType } from "@/lib/api/types";

export const SERVICE_LABELS: Record<ServiceType, string> = {
  performance: "Performance",
  rehab: "Rehab",
  recovery: "Recovery",
};

export type Daypart = "mañana" | "tarde" | "noche";

export function daypartOf(startTime: string): Daypart {
  const hour = Number(startTime.slice(0, 2));
  if (hour < 13) return "mañana";
  if (hour < 20) return "tarde";
  return "noche";
}

/** "Mañana", "Tarde"; two bands of one service in the same part of the day fall back to their hours. */
export function bandTitle(band: DayBandDto, siblings: DayBandDto[]): string {
  const daypart = daypartOf(band.template.startTime);
  const sameDaypart = siblings.filter((other) => daypartOf(other.template.startTime) === daypart);
  if (sameDaypart.length > 1) return band.label;
  return daypart.charAt(0).toUpperCase() + daypart.slice(1);
}
