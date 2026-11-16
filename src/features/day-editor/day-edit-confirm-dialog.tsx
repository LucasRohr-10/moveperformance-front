import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Notice } from "@/components/ui/notice";
import type { DayImpactDto } from "@/lib/api/types";
import { cn } from "@/lib/cn";

import { pluralize } from "./plural";

export interface DayEditConfirmDialogProps {
  impact: DayImpactDto;
  /** The day and what is being cancelled, e.g. "Mié. 12/11 · Recovery 09:00 · franja de la tarde (3)". */
  subtitle: string;
  reason: string;
  isBusy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

function GroupRow({ label, count, isWarning = false }: { label: string; count: number; isWarning?: boolean }) {
  return (
    <div className={cn("flex justify-between gap-3 border-b border-line px-3 py-2.5 text-[13px] last:border-b-0", isWarning && "text-warning")}>
      <span>{label}</span>
      <span className="min-w-6 text-[15px] font-semibold">{count}</span>
    </div>
  );
}

// Asked only when the change cancels bookings. It says how many, grouped by what they paid with,
// and never who: the names are on each slot's list and under Pagos.
export function DayEditConfirmDialog({ impact, subtitle, reason, isBusy, onConfirm, onCancel }: DayEditConfirmDialogProps) {
  const { total, package: packageCount, planOrFollowup, payment } = impact.affectedBookings;
  const groups = [
    { label: "Con paquete · la sesión vuelve al paquete", count: packageCount, isWarning: false },
    { label: "Con plan · no consume nada", count: planOrFollowup, isWarning: false },
    { label: "Pagadas aparte · quedan para revisar", count: payment, isWarning: true },
  ].filter((group) => group.count > 0);

  return (
    <ConfirmDialog
      title={`¿Cancelar ${pluralize(impact.cancelledSlots, "turno", "turnos")} con ${pluralize(total, "reserva", "reservas")}?`}
      description={subtitle}
      confirmLabel={`Cancelar ${pluralize(total, "reserva", "reservas")} y guardar`}
      cancelLabel="Volver"
      tone="destructive"
      isBusy={isBusy}
      onConfirm={onConfirm}
      onCancel={onCancel}
    >
      <div className="mt-4 flex flex-col gap-3">
        <div className="rounded border border-line">
          {groups.map((group) => (
            <GroupRow key={group.label} {...group} />
          ))}
        </div>
        <p className="text-[11px] text-muted">
          Los nombres los ves después en la lista de cada turno y en Pagos → Para revisar.
        </p>
        {payment > 0 ? (
          <Notice tone="warning" role={null}>
            <b>{payment === 1 ? "1 reserva se pagó aparte." : `${payment} reservas se pagaron aparte.`}</b> No se devuelve la
            plata sola. Van a aparecer en <b>Pagos → Para revisar</b> para que decidas si devolverla en Mercado Pago o
            coordinar otro turno con el cliente.
          </Notice>
        ) : null}
        <Notice tone="info" role={null}>
          {`Cada cliente recibe un mail y un aviso en la app con el motivo: "${reason}".`}
        </Notice>
      </div>
    </ConfirmDialog>
  );
}
