import type { ReactNode } from "react";

export interface BarListItem {
  label: ReactNode;
  value: number;
  /** A CSS token. Gray when there is none: hue is for the three services. */
  color?: string;
  /** How full the bar is, 0 to 1, as the API sent it (a renewal rate). `null` is no data: an empty bar. Without it the bar is drawn against the longest one. */
  fill?: number | null;
  /** What is written at the end of the row, when it is not the value alone ("11 de 14"). */
  text?: string;
  /** A line under the row: "6 el mismo día". */
  note?: ReactNode;
}

function fillWidth(item: BarListItem, max: number): number {
  if (item.fill === null) return 0;
  if (item.fill !== undefined) return Math.round(item.fill * 10000) / 100;
  return max > 0 ? (item.value / max) * 100 : 0;
}

/** Horizontal bars in plain HTML: they need no script, and every value is written next to its bar. */
export function BarList({ items, format }: { items: BarListItem[]; format: (value: number) => string }) {
  const max = Math.max(0, ...items.map((item) => item.value));

  return (
    <ul className="m-0 list-none p-0">
      {items.map((item, index) => (
        <li key={index} className="py-1.5 text-[13px]">
          <div className="grid grid-cols-[minmax(104px,170px)_minmax(0,1fr)_auto] items-center gap-3 lg:grid-cols-[minmax(110px,170px)_minmax(0,1fr)_auto]">
            <span className="truncate">{item.label}</span>
            <span aria-hidden="true" className="h-2.5 rounded-r-[3px] bg-line">
              <span
                data-fill
                className="block h-full rounded-r-[3px]"
                style={{ width: `${fillWidth(item, max)}%`, background: item.color ?? "var(--color-chart-1)" }}
              />
            </span>
            <span className="min-w-9 text-right tabular-nums">{item.text ?? format(item.value)}</span>
          </div>
          {item.note ? <p className="mt-0.5 text-[11px] text-muted">{item.note}</p> : null}
        </li>
      ))}
    </ul>
  );
}
