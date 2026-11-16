import { SERVICE_LABELS } from "@/features/payments/staff";
import type { SlotsStatsDto } from "@/lib/api/types";

import { SERVICE_PARAMS, type DashboardParams } from "../../dashboard-params";
import { BarList, type BarListItem } from "../charts/bar-list";
import { formatCount, formatShare } from "../charts/value-format";
import { KpiTile } from "../kpi-tile";
import { loadStats } from "../load-stats";
import { NegocioCard } from "../negocio-card";
import { NegocioInvalidRange, NegocioSectionError } from "../negocio-section-error";
import { PeriodNote } from "../period-note";
import { shownServices } from "../services";
import { BusyHoursCard } from "./busy-hours-card";
import { getSlotsStats } from "./get-slots-stats";
import { SeatsCard } from "./seats-card";

const INFO = {
  occupancy: "Cupos reservados ÷ cupos ofrecidos en turnos no cancelados.",
  attendance:
    "Presentes ÷ reservas ya marcadas (presente o ausente) de turnos que ya empezaron. Las que todavía no se marcaron no cuentan: se ven aparte en Qué pasó con los cupos.",
  cancellations:
    "Reservas confirmadas que después se cancelaron, de turnos del período. No incluye las que nunca se pagaron ni las que vencieron sin pagar. “El mismo día” es cancelar el día del turno.",
} as const;

const REASON_LABELS: Record<SlotsStatsDto["cancellationsByReason"][number]["reason"], string> = {
  client: "Las canceló el cliente",
  staff: "Las canceló el staff",
  studio_closed: "El estudio cerró el turno",
  deactivation: "Baja del cliente",
  staff_unknown: "Staff (sin detalle)",
};

const REASON_ORDER = Object.keys(REASON_LABELS) as (keyof typeof REASON_LABELS)[];

function reasonItems(stats: SlotsStatsDto): BarListItem[] {
  return REASON_ORDER.flatMap((reason) => {
    const row = stats.cancellationsByReason.find((item) => item.reason === reason);
    return row ? [{ label: REASON_LABELS[reason], value: row.count, note: `${row.sameDay} el mismo día` }] : [];
  });
}

/** Turnos: do we use the turnos we open? Every number arrives from the API, and the front only formats it. */
export async function TurnosSection({ params }: { params: DashboardParams }) {
  const load = await loadStats(() => getSlotsStats(params));
  if ("failure" in load) {
    return load.failure === "invalid-range" ? (
      <NegocioInvalidRange params={params} />
    ) : (
      <NegocioSectionError title="No pudimos cargar los turnos" params={params} />
    );
  }
  const { stats } = load;

  const { meta } = stats;
  const services = shownServices(params);
  const kpi = { comparison: meta.comparison, compare: params.compare };
  const serviceSuffix = params.service === SERVICE_PARAMS.ALL ? "" : ` · ${SERVICE_LABELS[params.service]}`;

  return (
    <div className="grid gap-4">
      <PeriodNote meta={meta} source="turnos" />
      <h2 className="m-0 font-display text-lg font-extrabold lg:text-[22px]">{`¿Usamos bien los turnos que abrimos?${serviceSuffix}`}</h2>
      <div className="grid gap-4 lg:grid-cols-3">
        <KpiTile
          label="Ocupación"
          info={INFO.occupancy}
          value={formatShare(stats.occupancy.current)}
          metric={stats.occupancy}
          note={`${stats.occupancy.booked} de ${stats.occupancy.offered} cupos`}
          {...kpi}
        />
        <KpiTile label="Asistencia" info={INFO.attendance} value={formatShare(stats.attendance.current)} metric={stats.attendance} {...kpi} />
        <KpiTile
          label="Cancelaciones"
          info={INFO.cancellations}
          value={formatCount(stats.cancellations.current)}
          metric={stats.cancellations}
          downIsGood
          note={<span className="text-warning">{`${stats.sameDayCancellations} el mismo día`}</span>}
          {...kpi}
        />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="min-w-0 lg:col-span-2">
          <BusyHoursCard busyHours={stats.busyHours} heatmap={stats.heatmap} services={services} />
        </div>
        <SeatsCard seats={stats.seats.filter((row) => services.includes(row.service))} />
        <NegocioCard title="Quién cancela">
          <BarList items={reasonItems(stats)} format={formatCount} />
        </NegocioCard>
      </div>
    </div>
  );
}
