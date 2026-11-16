"use client";

import { useId } from "react";
import { Bar, BarChart, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { ChartTooltipBox } from "./chart-tooltip";

export interface LineWithBarsPoint {
  label: string;
  inProgress: boolean;
  /** The stock drawn as a line: active clients. */
  line: number;
  previousLine: number | null;
  /** The flows drawn as bars: joins above the axis, leaves below. */
  up: number;
  down: number;
  /** Leaves in progress: still inside the grace days. They add to `down`, they are not included in it; drawn hatched under it, absent when the chart has none. */
  downPending?: number;
}

export interface LineWithBarsChartProps {
  /** The conclusion in words: the chart is an image for a screen reader. */
  label: string;
  points: LineWithBarsPoint[];
  /** The name of the dashed line and of its tooltip row ("Período anterior"), or null when there is no comparison. */
  previousName: string | null;
}

const AXIS_TICK = { fill: "var(--color-muted)", fontSize: 11 };
const SYNC_ID = "line-with-bars";
const PREVIOUS_STROKE = "var(--color-chart-previous)";
const LEAVES_FILL = "var(--color-chart-3)";

/**
 * The line on top and the joins and leaves in a band under it, on the same columns. Two charts that share the
 * hover, because one chart with two scales would make the bars cross the line.
 */
export function LineWithBarsChart({ label, points, previousName }: LineWithBarsChartProps) {
  const patternId = `${useId().replace(/:/g, "")}-down-pending`;
  const hasPrevious = previousName !== null && points.some((point) => point.previousLine !== null);
  const hasPending = points.some((point) => (point.downPending ?? 0) > 0);
  // Leaves go below the axis, so they are negative for the chart (the tooltip prints them as positive).
  const data = points.map((point) => ({ ...point, downBelow: -point.down, downPendingBelow: -(point.downPending ?? 0) }));

  return (
    <div>
      <ul role="list" aria-label="Referencias del gráfico" className="mb-2.5 flex flex-wrap gap-x-3.5 gap-y-1 text-xs text-chart-previous">
        <li className="flex items-center gap-1.5">
          <span aria-hidden="true" className="w-3.5 border-t-2" style={{ borderColor: "var(--color-chart-1)" }} />
          Activos
        </li>
        {hasPrevious ? (
          <li className="flex items-center gap-1.5">
            <span aria-hidden="true" className="w-3.5 border-t-2 border-dashed" style={{ borderColor: PREVIOUS_STROKE }} />
            {previousName}
          </li>
        ) : null}
        <li className="flex items-center gap-1.5">
          <span aria-hidden="true" className="size-2.5 rounded-[2px]" style={{ background: "var(--color-chart-1)" }} />
          Altas
        </li>
        <li className="flex items-center gap-1.5">
          <span aria-hidden="true" className="size-2.5 rounded-[2px]" style={{ background: LEAVES_FILL }} />
          Bajas
        </li>
        {hasPending ? (
          <li className="flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className="size-2.5 rounded-[2px]"
              style={{ background: `repeating-linear-gradient(45deg, ${LEAVES_FILL} 0 2px, var(--color-card) 2px 4px)` }}
            />
            Bajas en curso
          </li>
        ) : null}
      </ul>
      <div role="img" aria-label={label} className="w-full">
        <div className="h-36">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} syncId={SYNC_ID} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} accessibilityLayer={false}>
              <CartesianGrid vertical={false} stroke="var(--color-line)" />
              <XAxis dataKey="label" hide />
              <YAxis
                tick={AXIS_TICK}
                tickLine={false}
                axisLine={false}
                width={44}
                domain={[(min: number) => Math.floor(min * 0.9), (max: number) => Math.ceil(max * 1.05)]}
              />
              <Tooltip
                content={({ active, payload, label: tooltipLabel }) => {
                  if (!active || !payload?.length) return null;
                  const point = payload[0].payload as LineWithBarsPoint;
                  return (
                    <ChartTooltipBox
                      title={point.inProgress ? `${tooltipLabel} · en curso` : String(tooltipLabel)}
                      rows={[
                        { name: "Activos", value: `${point.line}` },
                        ...(hasPrevious && point.previousLine !== null ? [{ name: previousName, value: `${point.previousLine}` }] : []),
                        { name: "Altas", value: `+${point.up}` },
                        { name: "Bajas", value: `−${point.down}` },
                        ...((point.downPending ?? 0) > 0 ? [{ name: "Bajas en curso", value: `−${point.downPending}` }] : []),
                      ]}
                    />
                  );
                }}
              />
              {hasPrevious ? (
                <Line dataKey="previousLine" stroke={PREVIOUS_STROKE} strokeWidth={2} strokeDasharray="4 4" dot={false} activeDot={false} isAnimationActive={false} />
              ) : null}
              <Line dataKey="line" stroke="var(--color-chart-1)" strokeWidth={2} dot={{ r: 3, fill: "var(--color-chart-1)", stroke: "var(--color-card)" }} isAnimationActive={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <div className="h-28">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} syncId={SYNC_ID} stackOffset="sign" margin={{ top: 4, right: 8, bottom: 0, left: 0 }} accessibilityLayer={false}>
              {hasPending ? (
                <defs>
                  <pattern id={patternId} patternUnits="userSpaceOnUse" width="4" height="4" patternTransform="rotate(45)">
                    <rect width="4" height="4" fill="var(--color-card)" />
                    <rect width="2" height="4" fill={LEAVES_FILL} />
                  </pattern>
                </defs>
              ) : null}
              <XAxis dataKey="label" tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: "var(--color-line-strong)" }} orientation="bottom" interval="preserveStartEnd" />
              <YAxis hide />
              <Tooltip content={() => null} cursor={{ fill: "var(--color-chart-cursor)" }} />
              <Bar dataKey="up" stackId="flow" fill="var(--color-chart-1)" maxBarSize={28} isAnimationActive={false} />
              <Bar dataKey="downBelow" stackId="flow" fill={LEAVES_FILL} maxBarSize={28} isAnimationActive={false} />
              {hasPending ? <Bar dataKey="downPendingBelow" stackId="flow" fill={`url(#${patternId})`} maxBarSize={28} isAnimationActive={false} /> : null}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
