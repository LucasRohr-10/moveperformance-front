import type { ReactNode } from "react";

import { ROUTES } from "@/config/constants/routes.constants";
import { clientsListHref, parseClientsListParams } from "@/features/clients/staff";
import { followUpRiskHref } from "@/features/followup";
import { toCollectHref } from "@/features/payments/staff";
import type { TodaySummaryDto } from "@/lib/api/types";
import { formatExactPrice } from "@/lib/money";

export interface HoyTileDef {
  key: "attendance" | "review" | "expiring" | "overdue" | "risk";
  label: string;
  /** The definition behind the "i" (from the mockup); it can mention a setting, so it reads the summary. */
  info(summary: TodaySummaryDto): string;
  href: string;
  value(summary: TodaySummaryDto): number;
  /** The line under the number when there is something. */
  note(summary: TodaySummaryDto): ReactNode;
  /** The line under a zero: it says there is nothing to do instead of disappearing. */
  zeroNote(summary: TodaySummaryDto): string;
}

const plural = (count: number, one: string, many: string): string => `${count} ${count === 1 ? one : many}`;

// Same filter the "Vencen pronto" chip of the clients list applies.
const EXPIRING_SOON_HREF = clientsListHref(parseClientsListParams({ vence: "pronto" }));

// In the order of the grid.
export const HOY_TILES: readonly HoyTileDef[] = [
  {
    key: "attendance",
    label: "Asistencia sin marcar",
    info: () => "Reservas de turnos de hoy que ya empezaron y todavía no tienen presente/ausente.",
    href: ROUTES.STAFF_SCHEDULE,
    value: (d) => d.attendanceUnmarked.bookings,
    note: (d) => `en ${plural(d.attendanceUnmarked.slots, "turno ya empezado", "turnos ya empezados")}`,
    zeroNote: () => "Todo marcado ✓",
  },
  {
    key: "review",
    label: "Pagos para revisar",
    info: () => "Pagos de Mercado Pago que quedaron con algún problema y necesitan que alguien los mire.",
    href: `${ROUTES.STAFF_PAYMENTS}?needsAttention=true`,
    value: (d) => d.paymentsToReview.purchases,
    note: () => "de Mercado Pago con algún problema",
    zeroNote: () => "Nada para revisar ✓",
  },
  {
    key: "expiring",
    label: "Vencen pronto",
    info: (d) =>
      `Clientes con un plan de Performance o Recovery que vence en los próximos ${d.expiringSoon.windowDays} días (ajuste de Configuración). No incluye los que tienen débito automático, que se renuevan solos.`,
    href: EXPIRING_SOON_HREF,
    value: (d) => d.expiringSoon.clients,
    note: (d) => (
      <>
        {d.expiringSoon.endingTomorrow > 0 ? (
          <>
            <span className="text-warning">
              {d.expiringSoon.endingTomorrow} {d.expiringSoon.endingTomorrow === 1 ? "vence" : "vencen"} mañana
            </span>
            {" · "}
          </>
        ) : null}
        {plural(d.expiringSoon.clients, "cliente", "clientes")}
      </>
    ),
    zeroNote: (d) => `Nadie vence en los próximos ${d.expiringSoon.windowDays} días ✓`,
  },
  {
    key: "overdue",
    label: "Cobros atrasados",
    info: () => "Cobros en mano que siguen abiertos de turnos de días anteriores.",
    href: toCollectHref(undefined, { overdue: true }),
    value: (d) => d.overdueCharges.charges,
    // Cash amounts can have cents, and the "Por cobrar" list this links to shows them: never round up.
    // With no price on any of them the total is $ 0, which would read as "nobody owes anything".
    note: (d) =>
      d.overdueCharges.total === 0 && d.overdueCharges.withoutAmount > 0 ? (
        `${d.overdueCharges.withoutAmount} sin precio · de días anteriores`
      ) : (
        <>
          <span className="text-warning">{formatExactPrice(d.overdueCharges.total)}</span> de días anteriores
          {d.overdueCharges.withoutAmount > 0 ? ` · ${d.overdueCharges.withoutAmount} sin precio` : null}
        </>
      ),
    zeroNote: () => "Nadie debe de días anteriores ✓",
  },
  {
    key: "risk",
    label: "Clientes en riesgo",
    info: () => "Personas (no alertas) con alguna alerta de riesgo abierta en Seguimiento: vencido sin renovar, inactividad prolongada, baja de frecuencia, una semana sin asistir o molestia reportada. Hoy esas alertas solo miran Performance.",
    href: followUpRiskHref(),
    value: (d) => d.clientsAtRisk.clients,
    note: (d) =>
      d.clientsAtRisk.urgent > 0 ? (
        <>
          <span className="text-danger">{plural(d.clientsAtRisk.urgent, "urgente", "urgentes")}</span> · vencidos o inactivos
        </>
      ) : (
        "ninguno urgente"
      ),
    zeroNote: () => "Nadie en riesgo ✓",
  },
];

/**
 * How many things on Hoy ask for something: the tiles with something to do, plus one for the birthday.
 * Expiring and at-risk clients are not counted: they are to watch, not to do today.
 */
export function countPending(summary: TodaySummaryDto, hasBirthday: boolean): number {
  const asking = [summary.attendanceUnmarked.bookings, summary.paymentsToReview.purchases, summary.overdueCharges.charges];
  return asking.filter((count) => count > 0).length + (hasBirthday ? 1 : 0);
}
