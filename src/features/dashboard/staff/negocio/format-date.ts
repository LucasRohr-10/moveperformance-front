import type { StatsGranularity } from "@/lib/api/types";

export const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

// Built by hand from "YYYY-MM-DD": the text must not depend on the punctuation ICU picks.
export function formatShortDate(date: string, withYear: boolean): string {
  const [year, month, day] = date.split("-").map(Number);
  return `${day} ${MONTHS[month - 1]}${withYear ? ` ${year}` : ""}`;
}

export const yearOf = (date: string): string => date.slice(0, 4);

/** The axis label of a bucket: "5 oct", or "oct" (with the year: "oct 26") when the buckets are months. */
export function bucketLabel(from: string, granularity: StatsGranularity, withYear: boolean): string {
  if (granularity !== "month") return formatShortDate(from, withYear);
  const [year, month] = from.split("-").map(Number);
  return withYear ? `${MONTHS[month - 1]} ${String(year).slice(2)}` : MONTHS[month - 1];
}

/** The whole span of a bucket, for the hover and the data table: "5 oct – 11 oct". */
export function bucketRange({ from, to }: { from: string; to: string }, withYear: boolean): string {
  return from === to ? formatShortDate(from, withYear) : `${formatShortDate(from, withYear)} – ${formatShortDate(to, withYear)}`;
}

/** A series that crosses a year needs the year on its dates. */
export function seriesSpansYears(series: { from: string; to: string }[]): boolean {
  return series.length > 0 && yearOf(series[0].from) !== yearOf(series[series.length - 1].to);
}
