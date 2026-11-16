"use client";

import { Cell, Pie, PieChart, Tooltip } from "recharts";

import { ChartTooltipBox } from "./chart-tooltip";
import { formatShare, formatValue, VALUE_FORMATS, type ValueFormat } from "./value-format";

export interface DonutPart {
  name: string;
  value: number;
  /** 0–1, as the API sent it: the chart does not divide. Null when there is nothing to share. */
  share: number | null;
  /** A CSS token: `var(--color-performance)`. */
  color: string;
}

export interface DonutChartProps {
  /** The conclusion in words: the chart is an image for a screen reader. */
  label: string;
  parts: DonutPart[];
  valueFormat?: ValueFormat;
}

const SIZE = 150;
const EMPTY_RING = [{ name: "Sin datos", value: 1, color: "var(--color-line)" }];

export function DonutChart({ label, parts, valueFormat = VALUE_FORMATS.COUNT }: DonutChartProps) {
  // A part of 0 would still take its gap between slices: it is left out of the ring (its table row stays).
  const drawn = parts.filter((part) => part.value > 0);
  // With nothing to split the ring is drawn empty, so the card keeps its shape.
  const slices = drawn.length > 0 ? drawn : EMPTY_RING;

  return (
    <div role="img" aria-label={label} className="shrink-0" style={{ width: SIZE, height: SIZE }}>
      <PieChart width={SIZE} height={SIZE} accessibilityLayer={false}>
        <Pie
          data={slices}
          dataKey="value"
          nameKey="name"
          innerRadius={52}
          outerRadius={75}
          paddingAngle={slices.length > 1 ? 2 : 0}
          stroke="none"
          isAnimationActive={false}
        >
          {slices.map((slice) => (
            <Cell key={slice.name} fill={slice.color} />
          ))}
        </Pie>
        {drawn.length > 0 ? (
          <Tooltip
            content={({ active, payload }) => {
              const entry = active ? payload?.[0] : undefined;
              if (!entry || typeof entry.value !== "number") return null;
              const part = drawn.find((item) => item.name === entry.name);
              return (
                <ChartTooltipBox
                  title={String(entry.name)}
                  rows={[{ name: formatShare(part?.share ?? null), value: formatValue(entry.value, valueFormat) }]}
                />
              );
            }}
          />
        ) : null}
      </PieChart>
    </div>
  );
}
