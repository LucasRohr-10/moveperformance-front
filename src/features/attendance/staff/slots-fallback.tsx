import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/cn";

import { SERVICE_LABEL, type LoadStatus, type ServiceFilter } from "./schedule-model";

/** What both views show instead of the rows: loading, a failed load, or a day (or filter) with nothing in it. */
export function SlotsFallback({
  status,
  filter,
  onRetry,
  className,
}: {
  status: LoadStatus;
  filter: ServiceFilter;
  onRetry(): void;
  /** Spacing of the loading placeholder, which has no padding of its own. */
  className?: string;
}) {
  if (status === "loading") {
    return (
      <div role="status" className={cn("space-y-3 py-5", className)}>
        <span className="sr-only">Cargando los turnos del día…</span>
        {[0, 1, 2, 3].map((row) => (
          <Skeleton key={row} className="h-8 w-full bg-line" />
        ))}
      </div>
    );
  }

  if (status === "error") {
    return (
      <EmptyState
        title="No pudimos cargar los turnos del día"
        description="Puede ser un problema temporario del servidor."
        role="alert"
        action={
          <Button variant="secondary" touchTarget onClick={onRetry}>
            Reintentar
          </Button>
        }
      />
    );
  }

  return filter === "all" ? (
    <EmptyState title="No hay turnos para este día" description="Revisá los templates de turnos si esperabas ver alguno." />
  ) : (
    <EmptyState title={`No hay turnos de ${SERVICE_LABEL[filter]} para este día`} />
  );
}
