import type { MetricValueDto, StatsMetaDto } from "@/lib/api/types";

import { COMPARE_PARAMS, type CompareParam } from "../dashboard-params";

export interface FormattedChange {
  /** The whole sentence. */
  text: string;
  /** The part that takes the color: "▲ 12%". Empty when there is no number to show. */
  figure: string;
  /** The part that stays gray: "vs período anterior". */
  context: string;
  /** The color, not the direction: `up` is good news (green), `down` is bad news (red). */
  tone: "up" | "down" | "neutral";
}

export const COMPARE_LABELS: Record<CompareParam, string> = {
  [COMPARE_PARAMS.PREVIOUS]: "período anterior",
  [COMPARE_PARAMS.LAST_YEAR]: "mismo período del año pasado",
  [COMPARE_PARAMS.NONE]: "",
};

const NO_TEXT: FormattedChange = { text: "", figure: "", context: "", tone: "neutral" };

/**
 * "▲ 12% vs período anterior". The API already computed `change`; this only picks the words. Down is good for
 * what the business wants less of (cancellations, bajas, paused), so the arrow follows the sign and the color follows
 * the meaning. A missing change is never printed as 0% or NaN.
 */
export function formatChange(
  metric: MetricValueDto,
  comparison: StatsMetaDto["comparison"],
  downIsGood: boolean,
  compare: CompareParam,
): FormattedChange {
  if (comparison === null) return NO_TEXT;
  if (!comparison.hasData) {
    return { text: "sin datos para comparar", figure: "", context: "sin datos para comparar", tone: "neutral" };
  }
  if (metric.change === null) return { text: "—", figure: "—", context: "", tone: "neutral" };

  const unit = metric.changeUnit === "points" ? " pts" : "%";
  const size = `${Math.abs(metric.change)}${unit}`;
  const against = `vs ${COMPARE_LABELS[compare]}`;
  if (metric.change === 0) {
    return { text: `= ${size} ${against}`, figure: `= ${size}`, context: against, tone: "neutral" };
  }

  const arrow = metric.change > 0 ? "▲" : "▼";
  const isGood = downIsGood ? metric.change < 0 : metric.change > 0;
  return { text: `${arrow} ${size} ${against}`, figure: `${arrow} ${size}`, context: against, tone: isGood ? "up" : "down" };
}
