"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/status-badge";
import { ROUTES } from "@/config/constants/routes.constants";
import type { OfflineChargeDto } from "@/lib/api/types";
import { cn } from "@/lib/cn";

import {
  formatOfflineAmount,
  offlineChargeHref,
  offlineChargeRowKey,
  offlineChargeSubtitle,
  offlineChargeWhat,
  offlineChargeWhen,
  PAYMENT_METHOD_LABELS,
  toCollectHref,
} from "./offline-charge-labels";
import { listOpenOfflineCharges } from "./offline-charges-api";
import { RecordPaymentButton } from "./record-payment-button";

type LoadStatus = "loading" | "ready" | "error";

export interface ToCollectListProps {
  /** Only this client's charges (from the URL). */
  clientId?: string;
  /** Only the charges of earlier days (`?atrasados=true`). */
  overdueOnly?: boolean;
  /** Only the charges of today's slots (`?dia=hoy`). Never on together with `overdueOnly`. */
  todayOnly?: boolean;
  /** Called with how many charges are open every time the list loads, so a count shown elsewhere stays right. */
  onTotalChange?(total: number): void;
  /** Called with the charges every time the list loads (the parent can read the client's name from them). */
  onItemsChange?(items: OfflineChargeDto[]): void;
  /** Called after a charge was recorded or found already closed, so a count shown elsewhere can be asked again. */
  onChanged?(): void;
}

const LINK_CLASS = "underline underline-offset-2 hover:no-underline";

// Desktop: one column per fact, so the eye can scan down a column; the last one has a fixed width so the buttons line up.
const ROW_GRID =
  "sm:grid sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1.4fr)_minmax(0,0.9fr)_minmax(0,0.8fr)_minmax(0,0.7fr)_14rem] sm:items-center sm:gap-x-5";

function ColumnHeaders() {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "hidden border-b border-line px-5 py-3 text-[11px] font-semibold tracking-[0.14em] text-muted uppercase",
        ROW_GRID,
      )}
    >
      <span>Cliente</span>
      <span>Qué</span>
      <span>Cuándo</span>
      <span>Medio</span>
      <span className="text-center">Monto</span>
      <span />
    </div>
  );
}

function ChargeRow({ charge, onChanged }: { charge: OfflineChargeDto; onChanged(): void }) {
  // A turn booked with an unpaid plan has no amount of its own: its "Marcar como pagado" pays the plan.
  const amount = charge.amount === null || charge.paysWith ? null : formatOfflineAmount(charge.amount);
  const subtitle = offlineChargeSubtitle(charge);
  const when = offlineChargeWhen(charge);
  const method = PAYMENT_METHOD_LABELS[charge.paymentMethod];

  return (
    <li className={cn("space-y-1.5 border-t border-line px-5 py-4 first:border-t-0 sm:space-y-0", ROW_GRID)}>
      <div className="min-w-0">
        {charge.client ? (
          <Link href={`${ROUTES.STAFF_CLIENTS}/${charge.client.id}`} className={`font-medium ${LINK_CLASS}`}>
            {charge.client.name}
          </Link>
        ) : (
          <span className="font-medium text-muted">Cliente eliminado</span>
        )}
      </div>
      <div className="min-w-0 space-y-1.5 text-sm">
        <p>
          <Link href={offlineChargeHref(charge.id)} className={LINK_CLASS}>
            {offlineChargeWhat(charge)}
          </Link>
        </p>
        {subtitle ? <p className="text-xs text-muted">{subtitle}</p> : null}
        {charge.slotStarted && charge.bookingId !== null ? (
          <p>
            <StatusBadge label="turno ya pasó" tone="danger" />
          </p>
        ) : null}
      </div>
      {when ? <p className="text-sm">{when}</p> : <p className="hidden text-sm text-muted sm:block">—</p>}
      <p className="text-sm text-muted">{method}</p>
      {amount ? (
        <p className="text-sm font-medium tabular-nums sm:text-center">{amount}</p>
      ) : (
        <p className="hidden text-sm text-muted sm:block sm:text-center">—</p>
      )}
      <div className="pt-1.5 sm:justify-self-end sm:pt-0">
        <RecordPaymentButton charge={charge} onChanged={onChanged} />
      </div>
    </li>
  );
}

function LoadingRows() {
  return (
    <ul aria-hidden="true">
      {[0, 1, 2].map((row) => (
        <li key={row} className="border-t border-line px-5 py-4 first:border-t-0">
          <Skeleton className="h-4 w-32 bg-line" />
          <Skeleton className="mt-2 h-4 w-48 bg-line" />
          <Skeleton className="mt-2 h-3 w-24 bg-line" />
        </li>
      ))}
    </ul>
  );
}

// Filter chips that are links, so the filter is in the URL and shareable (pattern: payments-view-toggle).
// Each one turns its own filter on or off; turning one on replaces the other, so they are never both on.
function FilterChip({ href, label, isCurrent }: { href: string; label: string; isCurrent: boolean }) {
  return (
    <Link
      href={href}
      aria-current={isCurrent ? "true" : undefined}
      className={cn(
        "inline-flex min-h-11 items-center rounded-full border px-[13px] text-xs transition-colors sm:min-h-0 sm:py-1.5",
        isCurrent ? "border-white bg-white font-semibold text-black" : "border-line text-muted hover:text-white",
      )}
    >
      {label}
    </Link>
  );
}

function FilterChips({
  clientId,
  overdueOnly,
  todayOnly,
}: {
  clientId?: string;
  overdueOnly: boolean;
  todayOnly: boolean;
}) {
  return (
    <div role="group" aria-label="Filtrar lo que hay por cobrar" className="flex flex-wrap gap-2">
      <FilterChip href={toCollectHref(clientId, { today: !todayOnly })} label="Solo de hoy" isCurrent={todayOnly} />
      <FilterChip
        href={toCollectHref(clientId, { overdue: !overdueOnly })}
        label="Solo atrasados"
        isCurrent={overdueOnly}
      />
    </div>
  );
}

function emptyCopyOf(overdueOnly?: boolean, todayOnly?: boolean): { title: string; description: string } {
  if (overdueOnly) return { title: "No hay cobros atrasados", description: "Nadie debe de días anteriores." };
  if (todayOnly) return { title: "No hay cobros para hoy", description: "Nadie tiene un turno de hoy por cobrar." };
  return {
    title: "No hay nada por cobrar",
    description: "Cuando Staff reserve un turno que se cobra por fuera va a aparecer acá.",
  };
}

/** Pagos > "Por cobrar": every open offline charge, in the order the backend sends them. */
export function ToCollectList({
  clientId,
  overdueOnly,
  todayOnly,
  onTotalChange,
  onItemsChange,
  onChanged,
}: ToCollectListProps) {
  const [items, setItems] = useState<OfflineChargeDto[]>([]);
  const [status, setStatus] = useState<LoadStatus>("loading");
  // Bumped to ask for the list again; the effect below is the only place that fetches.
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let isCurrent = true;
    listOpenOfflineCharges({
      ...(clientId ? { clientId } : {}),
      ...(overdueOnly ? { overdue: true } : {}),
      ...(todayOnly ? { today: true } : {}),
    }).then(
      (result) => {
        if (!isCurrent) return;
        setItems(result.items);
        setStatus("ready");
        onTotalChange?.(result.total);
        onItemsChange?.(result.items);
      },
      () => {
        if (isCurrent) setStatus("error");
      },
    );
    return () => {
      isCurrent = false;
    };
  }, [attempt, clientId, overdueOnly, todayOnly, onTotalChange, onItemsChange]);

  function handleChanged() {
    setAttempt((current) => current + 1);
    onChanged?.();
  }

  function retry() {
    setStatus("loading");
    setAttempt((current) => current + 1);
  }

  const emptyCopy = emptyCopyOf(overdueOnly, todayOnly);

  return (
    <div className="space-y-4">
      <FilterChips clientId={clientId} overdueOnly={Boolean(overdueOnly)} todayOnly={Boolean(todayOnly)} />
      <Card padding="none">
        {status === "loading" ? (
          <>
            <p role="status" className="sr-only">
              Cargando lo que hay por cobrar…
            </p>
            <LoadingRows />
          </>
        ) : status === "error" ? (
          <EmptyState
            title="No pudimos cargar lo que hay por cobrar"
            role="alert"
            action={
              <Button variant="secondary" touchTarget onClick={retry}>
                Reintentar
              </Button>
            }
          />
        ) : items.length === 0 ? (
          <EmptyState title={emptyCopy.title} description={emptyCopy.description} />
        ) : (
          <>
            <ColumnHeaders />
            <ul>
              {items.map((charge) => (
                <ChargeRow key={offlineChargeRowKey(charge)} charge={charge} onChanged={handleChanged} />
              ))}
            </ul>
          </>
        )}
      </Card>
    </div>
  );
}
