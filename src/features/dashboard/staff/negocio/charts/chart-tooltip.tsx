export interface TooltipRow {
  name: string;
  value: string;
  color?: string;
}

/** What shows on hover: the bucket, one row per series and, when it adds up, the total. */
export function ChartTooltipBox({ title, rows, total }: { title: string; rows: TooltipRow[]; total?: TooltipRow }) {
  return (
    <div className="min-w-[140px] max-w-[260px] rounded border border-line-strong bg-black px-[11px] py-[9px] text-xs text-white">
      <p className="mb-1 font-bold">{title}</p>
      {rows.map((row) => (
        <p key={row.name} className="flex items-center justify-between gap-3.5">
          <span className="flex items-center gap-1.5">
            {row.color ? <span aria-hidden="true" className="size-2 rounded-full" style={{ background: row.color }} /> : null}
            {row.name}
          </span>
          <span className="tabular-nums">{row.value}</span>
        </p>
      ))}
      {total ? (
        <p className="mt-1 flex justify-between gap-3.5 border-t border-line pt-1">
          <span>{total.name}</span>
          <span className="tabular-nums">{total.value}</span>
        </p>
      ) : null}
    </div>
  );
}
