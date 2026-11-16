"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/status-badge";
import { useSnackbar } from "@/components/ui/snackbar";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/table";
import { ROUTES } from "@/config/constants/routes.constants";
import type { OfflineChargeDto, StaffPaymentDto } from "@/lib/api/types";
import { cn } from "@/lib/cn";

import { formatOfflineAmount, offlineChargeHref, PAYMENT_METHOD_LABELS, toCollectHref } from "./offline-charge-labels";
import { listOpenOfflineCharges } from "./offline-charges-api";
import { PaymentsViewToggle } from "./payments-view-toggle";
import { listStaffPayments, resolvePayment, type StaffPaymentsFilter } from "./staff-payments-api";
import {
  ATTENTION_REASON_HELP,
  ATTENTION_REASON_LABELS,
  KIND_LABELS,
  ORIGIN_LABELS,
  PAYMENT_ORIGIN_OPTIONS,
  PAYMENTS_VIEWS,
  type PaymentsView,
  PURCHASE_KIND_OPTIONS,
  PURCHASE_STATUS_OPTIONS,
  SERVICE_LABELS,
  STATUS_LABELS,
  STATUS_TONE,
} from "./staff-payments-labels";
import { ToCollectList } from "./to-collect-list";

type LoadStatus = "loading" | "ready" | "error";

interface PageData {
  items: StaffPaymentDto[];
  total: number;
  pageSize: number;
}

const EMPTY_PAGE: PageData = { items: [], total: 0, pageSize: 20 };
const SEARCH_DEBOUNCE_MS = 400;

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("es-UY", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function initials(name: string | undefined): string {
  if (!name) return "—";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

const STROKE_ICON_PROPS = {
  viewBox: "0 0 16 16",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

function AttentionIcon({ className }: { className?: string }) {
  return (
    <svg {...STROKE_ICON_PROPS} className={className}>
      <path d="M8 2.2l6.2 11.3H1.8z" />
      <path d="M8 6.8v3M8 11.7v.1" />
    </svg>
  );
}

function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg {...STROKE_ICON_PROPS} className={className}>
      <path d="M10 3L5 8l5 5" />
    </svg>
  );
}

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg {...STROKE_ICON_PROPS} className={className}>
      <path d="M6 3l5 5-5 5" />
    </svg>
  );
}

const STATUS_TEXT_CLASS: Record<"success" | "warning" | "danger" | "neutral", string> = {
  success: "text-success",
  warning: "text-warning",
  danger: "text-danger",
  neutral: "text-muted",
};

/**
 * Dot + text, not a bordered badge: the redesign's own `.status` treatment
 * (`styles.css`) for dense table columns, distinct from the bordered
 * `StatusBadge` primitive the plans table still uses.
 */
function PaymentStatus({ status }: { status: StaffPaymentDto["status"] }) {
  const tone = STATUS_TONE[status];
  return (
    <span className={cn("inline-flex items-center gap-2 text-sm font-medium", STATUS_TEXT_CLASS[tone])}>
      {tone === "neutral" ? (
        <span className="size-[7px] shrink-0 rounded-full border-[1.5px] border-current" aria-hidden="true" />
      ) : (
        <span className="size-2 shrink-0 rounded-full bg-current" aria-hidden="true" />
      )}
      {STATUS_LABELS[status]}
    </span>
  );
}

/** Says the list is scoped to one client and lets staff drop that scope. */
function ClientFilterHint({ name, onClear }: { name: string | undefined; onClear(): void }) {
  return (
    <p className="flex flex-wrap items-center gap-2 text-sm text-muted">
      Mostrando solo los pagos de {name ?? "este cliente"}.
      <button type="button" onClick={onClear} className="text-xs underline underline-offset-2 hover:text-white">
        Quitar filtro
      </button>
    </p>
  );
}

/** A row of pulsing cells shaped like the real columns, so the load has the table's shape. */
function LoadingRows() {
  return (
    <TableBody>
      {[0, 1, 2, 3, 4].map((row) => (
        <TableRow key={row}>
          <TableCell>
            <div className="flex items-center gap-3">
              <Skeleton className="size-8 shrink-0 rounded-full bg-line" />
              <div>
                <Skeleton className="h-4 w-28 bg-line" />
                <Skeleton className="mt-1.5 h-3 w-36 bg-line" />
              </div>
            </div>
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-32 bg-line" />
            <Skeleton className="mt-1.5 h-3 w-24 bg-line" />
          </TableCell>
          <TableCell align="right">
            <Skeleton className="ml-auto h-4 w-16 bg-line" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-5 w-20 bg-line" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-3 w-24 bg-line" />
            <Skeleton className="mt-1.5 h-3 w-24 bg-line" />
          </TableCell>
          <TableCell />
        </TableRow>
      ))}
    </TableBody>
  );
}

/**
 * Pagos: a paginated, filterable list of purchases for staff to reconcile.
 * `filter` and `page` come from the URL (the parent Server Component reads
 * `searchParams`), so a filter change is shareable and survives a refresh —
 * the same pattern `FollowupPanel` uses for `?tipo=`.
 * `view` is also from the URL: "to-collect" swaps the table (and its filters) for
 * the open offline charges. The page remounts the panel when the view changes.
 */
export function StaffPaymentsPanel({
  filter,
  page,
  view,
  overdueOnly = false,
  todayOnly = false,
}: {
  filter: StaffPaymentsFilter;
  page: number;
  view: PaymentsView;
  /** Only the charges of earlier days in the to-collect view (`?atrasados=true`). */
  overdueOnly?: boolean;
  /** Only the charges of today's slots in the to-collect view (`?dia=hoy`). */
  todayOnly?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [data, setData] = useState<PageData>(EMPTY_PAGE);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [search, setSearch] = useState(filter.q || "");
  const [appliedSearch, setAppliedSearch] = useState(filter.q || "");
  const requestedSearchRef = useRef("");
  // Tracked by id, not a single flag, so reviewing one payment never disables the others' buttons.
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [paymentToReview, setPaymentToReview] = useState<StaffPaymentDto | null>(null);
  // How many offline charges are open; null until known or if it could not be loaded.
  const [toCollectCount, setToCollectCount] = useState<number | null>(null);
  // Bumped to ask for the chip's count again.
  const [countAttempt, setCountAttempt] = useState(0);
  // Remembered once seen, so the hint keeps the name after the client's last charge is paid.
  const [chargesClientName, setChargesClientName] = useState<string | undefined>(undefined);
  const { showSnackbar } = useSnackbar();
  const isToCollectView = view === PAYMENTS_VIEWS.TO_COLLECT;

  function reload() {
    setStatus("loading");
    return listStaffPayments(filter, page).then(
      (result) => {
        setData(result);
        setStatus("ready");
      },
      () => setStatus("error"),
    );
  }

  // Only the fetch itself runs here, resolved asynchronously: `filter`/`page` are
  // props driven by the URL, and their *trigger* (pushQuery, below) already set
  // "loading" synchronously, the same way `daily-slots-panel` does from its date
  // picker instead of from this effect.
  useEffect(() => {
    if (isToCollectView) return;
    let isCurrent = true;
    listStaffPayments(filter, page).then(
      (result) => {
        if (!isCurrent) return;
        setData(result);
        setStatus("ready");
      },
      () => {
        if (isCurrent) setStatus("error");
      },
    );
    return () => {
      isCurrent = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-fetch only when the resolved filter/page actually change
  }, [filter.status, filter.kind, filter.origin, filter.needsAttention, filter.clientId, filter.q, page]);

  // Only for the chip's number. The unfiltered to-collect list loads (and reports) its own total; a filtered one does not.
  const skipCountFetch = isToCollectView && !filter.clientId && !overdueOnly && !todayOnly;
  useEffect(() => {
    if (skipCountFetch) return;
    let isCurrent = true;
    listOpenOfflineCharges({}).then(
      (result) => {
        if (isCurrent) setToCollectCount(result.total);
      },
      () => undefined,
    );
    return () => {
      isCurrent = false;
    };
  }, [skipCountFetch, countAttempt]);

  const rememberChargesClientName = useCallback((charges: OfflineChargeDto[]) => {
    const name = charges.find((charge) => charge.client)?.client?.name;
    if (name) setChargesClientName(name);
  }, []);

  // Debounced search: waits for typing to settle instead of requiring a submit,
  // and only fires once the trimmed term actually changed from what's on screen
  // and isn't already in flight.
  useEffect(() => {
    const term = search.trim();
    if (term === appliedSearch || term === requestedSearchRef.current) return;
    const timer = setTimeout(
      () => void pushQuery({ q: term || undefined, page: 1 }),
      SEARCH_DEBOUNCE_MS,
    );
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-run only when `search` changes; pushQuery is read fresh each time
  }, [search]);

  function pushQuery(next: Partial<StaffPaymentsFilter> & { page?: number }) {
    const merged = { ...filter, ...next };
    const params = new URLSearchParams();
    if (merged.status) params.set("status", merged.status);
    if (merged.kind) params.set("kind", merged.kind);
    if (merged.origin) params.set("origin", merged.origin);
    if (merged.needsAttention) params.set("needsAttention", "true");
    if (merged.clientId) params.set("clientId", merged.clientId);
    if (merged.q) {
      params.set("q", merged.q);
      requestedSearchRef.current = merged.q;
      setAppliedSearch(merged.q);
    } else {
      requestedSearchRef.current = "";
      setAppliedSearch("");
    }
    const nextPage = next.page ?? 1;
    if (nextPage > 1) params.set("page", String(nextPage));

    setStatus("loading");
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  function clearClientFilter() {
    pushQuery({ clientId: undefined });
  }

  function clearSearch() {
    setSearch("");
    void pushQuery({ q: undefined, page: 1 });
  }

  function clearFilters() {
    setSearch("");
    setStatus("loading");
    router.push(pathname);
  }

  async function confirmReview(): Promise<void> {
    if (!paymentToReview || pendingId) return;
    const { purchaseId } = paymentToReview;
    setPendingId(purchaseId);
    try {
      const reviewed = await resolvePayment(purchaseId);
      setData((current) => ({
        ...current,
        items: current.items.map((item) => (item.purchaseId === purchaseId ? reviewed : item)),
      }));
      setPaymentToReview(null);
      showSnackbar({ tone: "success", title: "Pago marcado como revisado" });
    } catch {
      showSnackbar({ tone: "danger", title: "No pudimos marcar el pago como revisado. Probá de nuevo." });
    } finally {
      setPendingId(null);
    }
  }

  function cancelReview() {
    setPaymentToReview(null);
  }

  if (isToCollectView) {
    return (
      <div className="space-y-4">
        <PaymentsViewToggle view={view} toCollectCount={toCollectCount} />
        {filter.clientId ? (
          <ClientFilterHint
            name={chargesClientName}
            onClear={() => router.push(toCollectHref(undefined, { overdue: overdueOnly, today: todayOnly }))}
          />
        ) : null}
        <ToCollectList
          // A new filter remounts the list, so it shows loading and not the rows of the old one.
          key={`${filter.clientId ?? ""}:${overdueOnly}:${todayOnly}`}
          clientId={filter.clientId}
          overdueOnly={overdueOnly}
          todayOnly={todayOnly}
          // The chip counts every open charge, so a list filtered by client, overdue or today does not report its own total.
          onTotalChange={filter.clientId || overdueOnly || todayOnly ? undefined : setToCollectCount}
          onItemsChange={filter.clientId ? rememberChargesClientName : undefined}
          onChanged={() => setCountAttempt((current) => current + 1)}
        />
      </div>
    );
  }

  const hasFilters = Boolean(
    filter.status || filter.kind || filter.origin || filter.needsAttention || filter.clientId || filter.q,
  );
  const attentionCount = data.items.filter((item) => item.needsAttention).length;
  const totalPages = Math.max(1, Math.ceil(data.total / (data.pageSize || 1)));
  const rangeStart = data.total === 0 ? 0 : (page - 1) * data.pageSize + 1;
  const rangeEnd = Math.min(page * data.pageSize, data.total);

  const filteredClientName = data.items.find((item) => item.client)?.client?.name;

  return (
    <div className="space-y-4">
      <PaymentsViewToggle view={view} toCollectCount={toCollectCount} />
      {filter.clientId ? (
        <ClientFilterHint name={filteredClientName} onClear={clearClientFilter} />
      ) : null}
      <Card padding="sm">
        <div className="space-y-4">
          <div>
            <Input
              label="Buscar cliente"
              name="q"
              placeholder="Nombre o email"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              labelAction={
                search ? (
                  <button
                    type="button"
                    onClick={clearSearch}
                    className="text-xs text-muted underline underline-offset-2 hover:text-white"
                  >
                    Limpiar
                  </button>
                ) : undefined
              }
            />
            {search.trim() !== appliedSearch ? (
              <p className="mt-2 text-xs text-muted">Buscando…</p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-end gap-4">
            <div className="min-w-[calc(50%-8px)] max-w-[240px] flex-1 sm:min-w-[160px]">
              <Select
                label="Estado"
                value={filter.status ?? ""}
                onChange={(event) =>
                  pushQuery({
                    status: (event.target.value || undefined) as StaffPaymentsFilter["status"],
                  })
                }
              >
                <option value="">Todos</option>
                {PURCHASE_STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {STATUS_LABELS[status]}
                  </option>
                ))}
              </Select>
            </div>

          <div className="min-w-[calc(50%-8px)] max-w-[240px] flex-1 sm:min-w-[160px]">
            <Select
              label="Tipo de compra"
              value={filter.kind ?? ""}
              onChange={(event) =>
                pushQuery({
                  kind: (event.target.value || undefined) as StaffPaymentsFilter["kind"],
                })
              }
            >
              <option value="">Todos</option>
              {PURCHASE_KIND_OPTIONS.map((kind) => (
                <option key={kind} value={kind}>
                  {KIND_LABELS[kind]}
                </option>
              ))}
            </Select>
          </div>

          <div className="min-w-[calc(50%-8px)] max-w-[240px] flex-1 sm:min-w-[160px]">
            <Select
              label="Origen"
              value={filter.origin ?? ""}
              onChange={(event) =>
                pushQuery({
                  origin: (event.target.value || undefined) as StaffPaymentsFilter["origin"],
                })
              }
            >
              <option value="">Todos</option>
              {PAYMENT_ORIGIN_OPTIONS.map((origin) => (
                <option key={origin} value={origin}>
                  {ORIGIN_LABELS[origin]}
                </option>
              ))}
            </Select>
          </div>

          <button
            type="button"
            aria-pressed={Boolean(filter.needsAttention)}
            onClick={() => pushQuery({ needsAttention: filter.needsAttention ? undefined : true })}
            className={cn(
              "inline-flex w-full items-center gap-2 rounded border px-3.5 py-2.5 text-sm font-medium transition-colors sm:w-auto",
              filter.needsAttention
                ? "border-warning/30 bg-warning/10 text-warning hover:bg-warning/15"
                : "border-line text-white hover:bg-card",
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                "grid size-4 shrink-0 place-content-center rounded-sm border",
                filter.needsAttention ? "border-warning bg-warning text-black" : "border-line",
              )}
            >
              <svg
                {...STROKE_ICON_PROPS}
                className={cn("size-3", !filter.needsAttention && "invisible")}
              >
                <path d="M3 8.5l3 3 7-7" />
              </svg>
            </span>
            Solo con atención requerida
          </button>
          </div>
        </div>
      </Card>

      {status === "ready" && data.items.length > 0 ? (
        <p role="status" className="text-xs text-muted">
          {data.total} {data.total === 1 ? "pago" : "pagos"}
          {attentionCount > 0
            ? ` · ${attentionCount} de esta página ${attentionCount === 1 ? "requiere" : "requieren"} atención`
            : ""}
        </p>
      ) : null}

      <Card padding="none">
        {status === "error" ? (
          <EmptyState
            title="No pudimos cargar los pagos"
            description="Ocurrió un error al conectar con el servidor. Probá reintentar en unos segundos."
            role="alert"
            action={
              <Button variant="secondary" touchTarget onClick={reload}>
                Reintentar
              </Button>
            }
          />
        ) : status === "ready" && data.items.length === 0 ? (
          <EmptyState
            title="No hay pagos con estos filtros"
            description={
              hasFilters
                ? "No encontramos pagos con los filtros aplicados. Probá limpiarlos o elegí otra combinación de estado, tipo u origen."
                : "Todavía no se registró ningún pago."
            }
            action={
              hasFilters ? (
                <Button variant="secondary" touchTarget onClick={clearFilters}>
                  Limpiar filtros
                </Button>
              ) : undefined
            }
          />
        ) : (
          <>
            {status === "loading" ? (
              <p role="status" className="sr-only">
                Cargando pagos…
              </p>
            ) : null}
            <Table caption="Pagos">
              <TableHeader>
                <TableHeaderCell>Cliente</TableHeaderCell>
                <TableHeaderCell>Compra</TableHeaderCell>
                <TableHeaderCell align="right">Monto</TableHeaderCell>
                <TableHeaderCell>Estado</TableHeaderCell>
                <TableHeaderCell>Creado / aprobado</TableHeaderCell>
                <TableHeaderCell>
                  <span className="sr-only">Acción</span>
                </TableHeaderCell>
              </TableHeader>
              {status === "loading" ? (
                <LoadingRows />
              ) : (
                <TableBody>
                  {data.items.map((payment) => (
                    <TableRow
                      key={payment.purchaseId}
                      className={payment.needsAttention ? "bg-warning/5" : undefined}
                    >
                      <TableCell
                        className={cn(
                          "align-top",
                          payment.needsAttention && "border-l-2 border-warning",
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-line bg-soft text-xs font-semibold">
                            {initials(payment.client?.name)}
                          </span>
                          <div className="min-w-0">
                            {payment.client ? (
                              <Link
                                href={`${ROUTES.STAFF_CLIENTS}/${payment.client.id}`}
                                className="block font-medium underline underline-offset-2 hover:no-underline"
                              >
                                {payment.client.name}
                              </Link>
                            ) : (
                              <span className="block font-medium text-muted">
                                Cliente eliminado
                              </span>
                            )}
                            <span className="block text-xs text-muted">
                              {payment.client?.email ?? "—"}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="align-top">
                        {payment.kind === "plan" && payment.planId ? (
                          <Link
                            href={`${ROUTES.STAFF_PLANS}/${payment.planId}`}
                            className="block font-medium underline underline-offset-2 hover:no-underline"
                          >
                            {payment.itemName}
                          </Link>
                        ) : (
                          <span className="block">{payment.itemName}</span>
                        )}
                        <span className="mt-1 block text-xs text-muted">
                          {KIND_LABELS[payment.kind]} · {SERVICE_LABELS[payment.service]} ·{" "}
                          {payment.paymentMethod === "mercado_pago"
                            ? ORIGIN_LABELS[payment.origin]
                            : PAYMENT_METHOD_LABELS[payment.paymentMethod]}
                        </span>
                      </TableCell>
                      <TableCell align="right" className="align-top whitespace-nowrap">
                        <span className="block">{formatOfflineAmount(payment.amount)}</span>
                        <span className="block text-xs text-muted">{payment.currency}</span>
                      </TableCell>
                      <TableCell className="align-top">
                        <PaymentStatus status={payment.status} />
                        {payment.needsAttention && payment.attentionReason ? (
                          <div className="mt-1.5 space-y-1">
                            <StatusBadge
                              label={ATTENTION_REASON_LABELS[payment.attentionReason] ?? "Requiere revisión"}
                              tone="warning"
                            />
                            {payment.attentionNote ? (
                              <p className="text-xs text-muted">{payment.attentionNote}</p>
                            ) : null}
                            {ATTENTION_REASON_HELP[payment.attentionReason] ? (
                              <p className="text-xs text-white">{ATTENTION_REASON_HELP[payment.attentionReason]}</p>
                            ) : null}
                          </div>
                        ) : payment.needsAttention ? (
                          <p className="mt-1.5 flex items-center gap-1.5 text-xs text-warning">
                            <AttentionIcon className="size-3" />
                            Requiere revisión
                          </p>
                        ) : null}
                      </TableCell>
                      <TableCell className="align-top whitespace-nowrap text-xs text-muted">
                        <span className="block text-white">{formatDate(payment.createdAt)}</span>
                        <span className="block">
                          {payment.approvedAt ? formatDate(payment.approvedAt) : "Sin aprobar"}
                        </span>
                      </TableCell>
                      <TableCell className="align-top whitespace-nowrap">
                        <div className="flex flex-col items-start gap-2">
                          {payment.paymentMethod !== "mercado_pago" ? (
                            <Link
                              href={offlineChargeHref(payment.purchaseId)}
                              className={buttonVariants({ variant: "secondary", size: "sm", touchTarget: true })}
                            >
                              Ver detalle
                            </Link>
                          ) : null}
                          {payment.needsAttention ? (
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              touchTarget
                              disabled={pendingId === payment.purchaseId}
                              onClick={() => setPaymentToReview(payment)}
                            >
                              Marcar revisado
                            </Button>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              )}
            </Table>
          </>
        )}
      </Card>

      {status === "ready" && data.total > 0 ? (
        <nav
          aria-label="Paginación de pagos"
          className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted"
        >
          <p>
            Mostrando {rangeStart}–{rangeEnd} de {data.total}
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              touchTarget
              disabled={page <= 1}
              onClick={() => pushQuery({ page: page - 1 })}
            >
              <ChevronLeftIcon className="size-4" />
              Anterior
            </Button>
            <span className="px-2 text-white">
              Página {page} de {totalPages}
            </span>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              touchTarget
              disabled={page >= totalPages}
              onClick={() => pushQuery({ page: page + 1 })}
            >
              Siguiente
              <ChevronRightIcon className="size-4" />
            </Button>
          </div>
        </nav>
      ) : null}

      {paymentToReview ? (
        <ConfirmDialog
          title="¿Marcar este pago como revisado?"
          description={
            `Vas a quitar la marca de "requiere atención" de ${paymentToReview.client?.name ?? "este cliente"} para ${paymentToReview.itemName}. Esto no cambia el estado del pago, solo registra que ya lo revisaste.`
          }
          confirmLabel="Marcar revisado"
          isBusy={pendingId === paymentToReview.purchaseId}
          onConfirm={() => void confirmReview()}
          onCancel={cancelReview}
        />
      ) : null}
    </div>
  );
}
