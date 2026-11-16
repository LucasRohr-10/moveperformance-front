"use client";

import { usePathname, useRouter } from "next/navigation";
import { useId } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useSnackbar } from "@/components/ui/snackbar";
import { todayBusinessDate } from "@/features/bookings/slots";
import type { AlertDto, AlertType } from "@/lib/api/types";
import { cn } from "@/lib/cn";

import { ALERT_ROW_GRID, AlertRow, type AlertNotice } from "./alert-row";
import { AlertFilters } from "./alert-filters";
import { ALERT_LABELS, ALERT_ORDER, ALERT_TONE } from "./followup-labels";
import { useFollowupAlerts } from "./use-followup-alerts";

type UrgencyTone = (typeof ALERT_TONE)[AlertType];

const URGENCY_GROUPS: readonly { tone: UrgencyTone; label: string; dotClass: string }[] = [
  { tone: "danger", label: "Urgentes", dotClass: "bg-danger" },
  { tone: "warning", label: "Requieren atención", dotClass: "bg-warning" },
  { tone: "neutral", label: "Para seguimiento", dotClass: "bg-muted" },
];

const COLUMNS = ["Cliente", "Alerta", "Qué pasó", "Última asistencia"] as const;

const byAlertOrder = (a: AlertDto, b: AlertDto): number => ALERT_ORDER.indexOf(a.type) - ALERT_ORDER.indexOf(b.type);

// The most urgent group first; inside a group, by type and then in the order the API sent them.
function groupByUrgency(alerts: AlertDto[]) {
  return URGENCY_GROUPS.map((group) => ({
    ...group,
    alerts: alerts.filter((alert) => ALERT_TONE[alert.type] === group.tone).sort(byAlertOrder),
  })).filter((group) => group.alerts.length > 0);
}

function emptyMessage(type: AlertType | null, riskOnly: boolean): string {
  if (riskOnly) return "No hay clientes en riesgo para revisar.";
  return type === null
    ? "No hay alertas abiertas para revisar."
    : `No hay alertas de "${ALERT_LABELS[type]}" para revisar.`;
}


function AlertList({
  alerts,
  type,
  riskOnly,
  onReload,
  renderRow,
}: {
  alerts: "loading" | "error" | { data: AlertDto[] };
  type: AlertType | null;
  riskOnly: boolean;
  onReload: () => void;
  renderRow: (alert: AlertDto) => React.ReactNode;
}) {
  const groupsId = useId();
  if (alerts === "loading") {
    return (
      <p aria-busy="true" className="mt-6 text-sm text-muted">
        Cargando alertas…
      </p>
    );
  }
  if (alerts === "error") {
    return (
      <div className="mt-6">
        <p role="alert" className="text-sm text-danger">
          No pudimos cargar las alertas.
        </p>
        <Button type="button" variant="secondary" size="sm" onClick={onReload} touchTarget className="mt-3">
          Reintentar
        </Button>
      </div>
    );
  }
  if (alerts.data.length === 0) {
    return (
      <Card className="mt-6">
        <p className="text-sm font-semibold">Sin alertas</p>
        <p className="mt-1 text-sm text-muted">{emptyMessage(type, riskOnly)}</p>
      </Card>
    );
  }
  return (
    <div className="mt-6 rounded border border-line bg-card">
      <div
        aria-hidden="true"
        className={cn(
          "hidden rounded-t border-b border-line bg-soft px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted",
          ALERT_ROW_GRID,
        )}
      >
        {COLUMNS.map((column) => (
          <span key={column}>{column}</span>
        ))}
        <span className="text-right">Acciones</span>
      </div>
      {groupByUrgency(alerts.data).map((group) => {
        const headingId = `${groupsId}-${group.tone}`;
        return (
          <section key={group.tone} aria-labelledby={headingId}>
            <h2
              id={headingId}
              className="flex items-center gap-2 border-b border-line bg-soft px-4 py-2.5 text-xs font-semibold first:rounded-t"
            >
              <span aria-hidden="true" className={cn("size-2 rounded-full", group.dotClass)} />
              {`${group.label} · ${group.alerts.length}`}
            </h2>
            <ul className="divide-y divide-line border-b border-line last:border-b-0">{group.alerts.map(renderRow)}</ul>
          </section>
        );
      })}
    </div>
  );
}

/** The open alerts of the clients, filtered by type (`?tipo=`) or to the ones at risk (`?riesgo=true`) through the URL. */
export function FollowupPanel({ type, riskOnly = false }: { type: AlertType | null; riskOnly?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const { alerts, counts, reload, handle } = useFollowupAlerts(type, riskOnly);
  const { showSnackbar } = useSnackbar();
  const announce = (notice: AlertNotice): void =>
    showSnackbar({ tone: notice.ok ? "success" : "danger", title: notice.message });
  const today = todayBusinessDate();

  function select(next: AlertType | null): void {
    router.replace(next === null ? pathname : `?tipo=${next}`);
  }

  function selectRisk(): void {
    router.replace("?riesgo=true");
  }

  return (
    <div>
      <AlertFilters
        selected={type}
        isRiskSelected={riskOnly}
        counts={counts}
        onSelect={select}
        onSelectRisk={selectRisk}
        onRetryCounts={reload}
      />
      <AlertList
        alerts={alerts}
        type={type}
        riskOnly={riskOnly}
        onReload={reload}
        renderRow={(alert) => (
          <AlertRow key={alert.id} alert={alert} today={today} onHandle={handle} onChanged={announce} onRefresh={reload} />
        )}
      />
    </div>
  );
}
