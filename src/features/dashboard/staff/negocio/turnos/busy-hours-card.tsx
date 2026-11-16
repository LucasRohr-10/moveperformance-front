"use client";

import { useState } from "react";

import { SegmentedControl } from "@/components/ui/segmented-control";
import { SERVICE_LABELS } from "@/features/payments/staff";
import type { ServiceType, SlotsStatsDto } from "@/lib/api/types";

import { ChartDataTable } from "../charts/chart-data-table";
import { LazyStackedColumnsChart } from "../charts/lazy-charts";
import { VALUE_FORMATS } from "../charts/value-format";
import { NegocioCard } from "../negocio-card";
import { SERVICE_COLORS } from "../services";
import { HeatmapTable } from "./heatmap-table";

const VIEWS = { BY_HOUR: "hour", BY_DAY_AND_HOUR: "day-and-hour" } as const;
type View = (typeof VIEWS)[keyof typeof VIEWS];

const VIEW_OPTIONS = [
  { value: VIEWS.BY_HOUR, label: "Por hora" },
  { value: VIEWS.BY_DAY_AND_HOUR, label: "Día y hora" },
];

const hourLabel = (hour: number) => `${String(hour).padStart(2, "0")}:00`;

export interface BusyHoursCardProps {
  busyHours: SlotsStatsDto["busyHours"];
  heatmap: SlotsStatsDto["heatmap"];
  /** The services the tab draws: all three, or the one in the URL. */
  services: ServiceType[];
}

/** "Horarios más concurridos": bookings by hour, or how full each turno was by day and hour. The toggle is local state, not the URL. */
export function BusyHoursCard({ busyHours, heatmap, services }: BusyHoursCardProps) {
  const [view, setView] = useState<View>(VIEWS.BY_HOUR);

  // With one service the hour is that service: a Total column would repeat it.
  const showsTotal = services.length > 1;
  const series = services.map((service) => ({ key: service, name: SERVICE_LABELS[service], color: SERVICE_COLORS[service] }));
  const buckets = busyHours.map((point) => ({
    label: String(point.hour).padStart(2, "0"),
    range: hourLabel(point.hour),
    inProgress: false,
    values: point.byService,
    total: point.total,
    previous: null,
  }));

  return (
    <NegocioCard
      title="Horarios más concurridos"
      action={
        <SegmentedControl
          aria-label="Ver por"
          options={VIEW_OPTIONS}
          value={view}
          onChange={setView}
          className="[&>button]:px-2.5 [&>button]:py-1.5 [&>button]:text-[10px] [&>button]:font-semibold [&>button]:uppercase [&>button]:tracking-[0.1em]"
        />
      }
    >
      {view === VIEWS.BY_HOUR ? (
        <>
          <LazyStackedColumnsChart
            label="Reservas por hora: cada columna es una hora de inicio, separada por servicio. Los datos exactos están en Ver datos."
            buckets={buckets}
            series={series}
            previousName={null}
            valueFormat={VALUE_FORMATS.COUNT}
          />
          <ChartDataTable
            caption="Reservas por hora"
            columns={["Hora", ...series.map((item) => item.name), ...(showsTotal ? ["Total"] : [])]}
            rows={busyHours.map((point) => [
              hourLabel(point.hour),
              ...services.map((service) => point.byService[service] ?? 0),
              ...(showsTotal ? [point.total] : []),
            ])}
          />
        </>
      ) : (
        <HeatmapTable cells={heatmap} />
      )}
    </NegocioCard>
  );
}
