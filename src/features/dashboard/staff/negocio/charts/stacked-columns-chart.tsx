"use client";

import { useId } from "react";
import { Bar, CartesianGrid, Cell, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { ChartTooltipBox } from "./chart-tooltip";
import { formatTick, formatValue, type ValueFormat } from "./value-format";

export interface StackedBucket {
  /** Short, for the axis: "5 oct". */
  label: string;
  /** The whole span of the bucket, for the hover: "5 oct – 11 oct". */
  range: string;
  /** A bucket that is not over yet: drawn hatched, so a low bar is not read as a bad period. */
  inProgress: boolean;
  values: Record<string, number>;
  /** What the whole bucket collected, as the API sent it: the chart does not add. Null when the API sent none: no Total row. */
  total: number | null;
  /** The same bucket of the comparison, or null when there is nothing to compare with. */
  previous: number | null;
}

export interface StackedSeries {
  key: string;
  name: string;
  /** A CSS token: `var(--color-performance)`. */
  color: string;
}

export interface StackedColumnsChartProps {
  /** The conclusion in words: the chart is an image for a screen reader. */
  label: string;
  buckets: StackedBucket[];
  series: StackedSeries[];
  /** The name of the dashed line ("mes anterior"), or null when there is no comparison. */
  previousName: string | null;
  valueFormat: ValueFormat;
}

const AXIS_TICK = { fill: "var(--color-muted)", fontSize: 11 };
const PREVIOUS_STROKE = "var(--color-chart-previous)";

export function StackedColumnsChart({ label, buckets, series, previousName, valueFormat }: StackedColumnsChartProps) {
  const patternPrefix = useId().replace(/:/g, "");
  const hasPrevious = previousName !== null && buckets.some((bucket) => bucket.previous !== null);
  const hasInProgress = buckets.some((bucket) => bucket.inProgress);
  const data = buckets.map((bucket) => ({ ...bucket.values, label: bucket.label, range: bucket.range, inProgress: bucket.inProgress, total: bucket.total, previous: bucket.previous }));

  return (
    <div>
      <ul role="list" aria-label="Referencias del gráfico" className="mb-2.5 flex flex-wrap gap-x-3.5 gap-y-1 text-xs text-chart-previous">
        {series.map((item) => (
          <li key={item.key} className="flex items-center gap-1.5">
            <span aria-hidden="true" className="size-2.5 rounded-[2px]" style={{ background: item.color }} />
            {item.name}
          </li>
        ))}
        {hasPrevious ? (
          <li className="flex items-center gap-1.5">
            <span aria-hidden="true" className="w-3.5 border-t-2 border-dashed" style={{ borderColor: PREVIOUS_STROKE }} />
            {previousName}
          </li>
        ) : null}
        {hasInProgress ? (
          <li className="flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className="size-2.5 rounded-[2px]"
              style={{ background: "repeating-linear-gradient(45deg, var(--color-chart-1) 0 2px, transparent 2px 4px)" }}
            />
            en curso
          </li>
        ) : null}
      </ul>
      <div role="img" aria-label={label} className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 0, bottom: 0, left: 0 }} accessibilityLayer={false}>
            <defs>
              {series.map((item) => (
                <pattern
                  key={item.key}
                  id={`${patternPrefix}-${item.key}`}
                  patternUnits="userSpaceOnUse"
                  width="4"
                  height="4"
                  patternTransform="rotate(45)"
                >
                  <rect width="4" height="4" fill="var(--color-card)" />
                  <rect width="2" height="4" fill={item.color} />
                </pattern>
              ))}
            </defs>
            <CartesianGrid vertical={false} stroke="var(--color-line)" />
            <XAxis dataKey="label" tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: "var(--color-line)" }} interval="preserveStartEnd" />
            <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} width={44} tickFormatter={(value: number) => formatTick(value, valueFormat)} />
            <Tooltip
              cursor={{ fill: "var(--color-chart-cursor)" }}
              content={({ active, payload, label: tooltipLabel }) => {
                if (!active || !payload?.length) return null;
                const rows = series.map((item) => ({
                  name: item.name,
                  color: item.color,
                  value: formatValue(Number(payload[0].payload[item.key] ?? 0), valueFormat),
                }));
                const total = payload[0].payload.total as number | null;
                const previous = payload[0].payload.previous as number | null;
                return (
                  <ChartTooltipBox
                    title={String(payload[0].payload.range ?? tooltipLabel)}
                    rows={[...rows, ...(hasPrevious && previous !== null ? [{ name: previousName ?? "", value: formatValue(previous, valueFormat) }] : [])]}
                    total={series.length > 1 && total !== null ? { name: "Total", value: formatValue(total, valueFormat) } : undefined}
                  />
                );
              }}
            />
            {series.map((item, index) => (
              <Bar
                key={item.key}
                dataKey={item.key}
                name={item.name}
                stackId="total"
                fill={item.color}
                stroke="var(--color-card)"
                maxBarSize={36}
                radius={index === series.length - 1 ? [3, 3, 0, 0] : 0}
                isAnimationActive={false}
              >
                {buckets.map((bucket) => (
                  <Cell key={bucket.label} fill={bucket.inProgress ? `url(#${patternPrefix}-${item.key})` : item.color} />
                ))}
              </Bar>
            ))}
            {hasPrevious ? (
              <Line
                dataKey="previous"
                name={previousName ?? undefined}
                stroke={PREVIOUS_STROKE}
                strokeWidth={2}
                strokeDasharray="4 4"
                dot={false}
                activeDot={false}
                connectNulls={false}
                isAnimationActive={false}
              />
            ) : null}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
