import type { SlotsStatsDto } from "@/lib/api/types";

import { Table, TableBody, TableCell, TableHeader, TableHeaderCell, TableRow } from "@/components/ui/table";

type HeatmapCell = SlotsStatsDto["heatmap"][number];

const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

const pad = (hour: number) => String(hour).padStart(2, "0");

// The shade only says "fuller or emptier": it is not a number anybody reads. It comes from the rate the API sent, and
// the seats are written in the cell. The cap only keeps the CSS percentage valid if a rate ever went over 1.
function shade(rate: number): string {
  return `color-mix(in srgb, var(--color-chart-1) ${Math.round((0.08 + Math.min(1, rate) * 0.85) * 100)}%, transparent)`;
}

const EMPTY_BACKGROUND =
  "repeating-linear-gradient(45deg, var(--color-line) 0 3px, var(--color-card) 3px 6px)";

/**
 * Day and hour, with how full each turno was. A real table: each cell says "6 de 8 cupos" to a screen reader, as the
 * API counted them. A cell without a rate (nothing offered), or with no cell at all, is striped and says "sin turnos".
 */
export function HeatmapTable({ cells }: { cells: HeatmapCell[] }) {
  if (cells.length === 0) return <p className="text-sm text-muted">No hubo turnos en el período.</p>;

  const weekdays = [...new Set(cells.map((cell) => cell.isoWeekday))].sort((a, b) => a - b);
  const hours = cells.map((cell) => cell.hour);
  const firstHour = Math.min(...hours);
  const lastHour = Math.max(...hours);
  const columns = Array.from({ length: lastHour - firstHour + 1 }, (_, index) => firstHour + index);
  const byCell = new Map(cells.map((cell) => [`${cell.isoWeekday}-${cell.hour}`, cell]));

  return (
    <div>
      <Table aria-label="Ocupación por día y hora" className="relative -mx-1 px-1">
        <TableHeader>
          <TableHeaderCell className="px-1 py-1.5" />
          {columns.map((hour) => (
            <TableHeaderCell key={hour} align="center" className="min-w-8 px-0.5 py-1.5 tracking-normal">
              {pad(hour)}
            </TableHeaderCell>
          ))}
        </TableHeader>
        <TableBody>
          {weekdays.map((weekday) => (
            <TableRow key={weekday} className="border-b-0">
              <TableHeaderCell scope="row" className="px-1 py-0.5 text-left tracking-normal">
                {WEEKDAYS[weekday - 1]}
              </TableHeaderCell>
              {columns.map((hour) => {
                const cell = byCell.get(`${weekday}-${hour}`);
                const rate = cell?.rate ?? null;
                const text = cell !== undefined && rate !== null ? `${cell.booked} de ${cell.offered} cupos` : "sin turnos";
                return (
                  <TableCell
                    key={hour}
                    align="center"
                    title={`${WEEKDAYS[weekday - 1]} ${pad(hour)}:00 · ${text}`}
                    className="h-7 border border-card p-0"
                    style={{ background: rate === null ? EMPTY_BACKGROUND : shade(rate) }}
                  >
                    <span className="sr-only">{text}</span>
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <p className="mt-2 text-xs text-muted">Más claro = más lleno · rayado = no hubo turnos</p>
    </div>
  );
}
