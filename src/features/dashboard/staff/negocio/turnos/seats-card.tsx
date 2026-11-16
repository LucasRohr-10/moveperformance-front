import { SERVICE_LABELS } from "@/features/payments/staff";
import type { SlotsStatsDto } from "@/lib/api/types";

import { ServiceDot } from "../../service-dot";
import { ChartDataTable } from "../charts/chart-data-table";
import { formatShare } from "../charts/value-format";
import { NegocioCard } from "../negocio-card";

type Seats = SlotsStatsDto["seats"][number];

const PARTS = [
  { key: "attended", legend: "Vinieron", phrase: "vinieron", background: "var(--color-chart-1)" },
  { key: "notAttended", legend: "No vinieron", phrase: "no vinieron", background: "var(--color-chart-2)" },
  {
    // Hatched, not a fourth gray: "sin marcar" is not a result, it is a pending task.
    key: "unmarked",
    legend: "Sin marcar",
    phrase: "sin marcar",
    background: "repeating-linear-gradient(45deg, var(--color-chart-1) 0 2px, var(--color-card) 2px 4px)",
  },
  {
    // Hatched the other way and wider than "sin marcar": these seats are not a task, the class has not started.
    key: "upcoming",
    legend: "Por venir",
    phrase: "por venir",
    background: "repeating-linear-gradient(135deg, var(--color-chart-2) 0 2px, var(--color-card) 2px 6px)",
  },
  { key: "free", legend: "Libres", phrase: "libres", background: "var(--color-chart-3)" },
] as const;

function seatsLabel(row: Seats): string {
  const phrases = PARTS.map((part) => `${row[part.key]} ${part.phrase}`);
  return `${SERVICE_LABELS[row.service]}, de ${row.offered} cupos: ${phrases.slice(0, -1).join(", ")} y ${phrases[phrases.length - 1]}`;
}

/**
 * "Qué pasó con los cupos": one bar per service. The segments take the width of their count (`flex-grow`), so the
 * card draws the API's counts and does not divide them; the counts are also written under each bar, and the
 * occupancy the API sent ("75% · 150 de 200 cupos") at the end of the service's line.
 */
export function SeatsCard({ seats }: { seats: Seats[] }) {
  return (
    <NegocioCard title="Qué pasó con los cupos">
      <ul role="list" aria-label="Referencias del gráfico" className="mb-3 flex flex-wrap gap-x-3.5 gap-y-1 text-xs text-chart-previous">
        {PARTS.map((part) => (
          <li key={part.key} className="flex items-center gap-1.5">
            <span aria-hidden="true" className="size-2.5 rounded-[2px]" style={{ background: part.background }} />
            {part.legend}
          </li>
        ))}
      </ul>
      <div className="grid gap-3">
        {seats.map((row) => (
          <div key={row.service}>
            <p className="mb-1 flex items-center gap-1.5 text-[13px]">
              <ServiceDot service={row.service} />
              {SERVICE_LABELS[row.service]}
              <span className="ml-auto text-right tabular-nums">{formatShare(row.occupancy)}</span>
              <span className="text-[11px] text-muted tabular-nums">{`${row.booked} de ${row.offered} cupos`}</span>
            </p>
            <div role="img" aria-label={seatsLabel(row)} className="flex h-3 overflow-hidden rounded-[3px] bg-line">
              {PARTS.filter((part) => row[part.key] > 0).map((part) => (
                <span
                  key={part.key}
                  title={`${part.legend}: ${row[part.key]} cupos`}
                  className="h-full border-r border-card last:border-r-0"
                  style={{ flex: `${row[part.key]} 1 0`, background: part.background }}
                />
              ))}
            </div>
            <p className="mt-1 text-[11px] text-muted tabular-nums">
              {PARTS.map((part) => `${row[part.key]} ${part.phrase}`).join(" · ")}
            </p>
          </div>
        ))}
      </div>
      <ChartDataTable
        caption="Qué pasó con los cupos"
        columns={["Servicio", "Ofrecidos", "Reservados", "Ocupación", ...PARTS.map((part) => part.legend)]}
        rows={seats.map((row) => [
          SERVICE_LABELS[row.service],
          row.offered,
          row.booked,
          formatShare(row.occupancy),
          ...PARTS.map((part) => row[part.key]),
        ])}
      />
    </NegocioCard>
  );
}
