"use client";

import Link from "next/link";
import { type ReactNode, useEffect, useState } from "react";

import { StaffPageHeader, StaffPageLoading } from "@/components/layout/staff-page";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { useSnackbar } from "@/components/ui/snackbar";
import { ROUTES } from "@/config/constants/routes.constants";
import { ApiError } from "@/lib/api/errors";
import type { OfflineChargeDetailDto, OfflinePaymentDto } from "@/lib/api/types";

import {
  formatChargeDateTime,
  formatOfflineAmount,
  formatPaidOn,
  OFFLINE_CHARGE_STATUS,
  offlineChargeTitle,
  planNoun,
  offlineErrorMessage,
  PAYMENT_METHOD_LABELS,
} from "./offline-charge-labels";
import { getOfflineCharge, getStaffReceiptLink, waiveOfflineCharge } from "./offline-charges-api";
import { openReceipt } from "./open-receipt";
import { ReasonDialog } from "./reason-dialog";
import { RecordPaymentButton } from "./record-payment-button";

type Failure = "not-found" | "error";

const BREADCRUMB = [{ label: "Pagos", href: ROUTES.STAFF_PAYMENTS }];
const PAGE_TITLE = "Cobro por fuera";
const PLAN_LABEL = { plan: "Plan", paquete: "Paquete" } as const;

const WAIVED_MESSAGE = "Marcado como que no se cobra.";
const WAIVE_FAILED_MESSAGE = "No pudimos cerrar el cobro. Probá de nuevo.";
const RECEIPT_FAILED_MESSAGE = "No pudimos abrir el comprobante. Probá de nuevo.";

const ROW_CLASS = "flex justify-between gap-4 border-t border-dashed border-line py-2.5 text-sm first:border-t-0 first:pt-0 last:pb-0";

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className={ROW_CLASS}>
      <dt className="shrink-0 text-muted">{label}</dt>
      <dd className="text-right">{children}</dd>
    </div>
  );
}

/** "Name · dd/mm hh:mm" and whatever else is known; a closing made by the system has no name. */
function whoAndWhen(person: { name: string } | null, iso: string | null, ...rest: Array<string | null>): string {
  return [person?.name ?? null, iso ? formatChargeDateTime(iso) : null, ...rest].filter(Boolean).join(" · ");
}

function isConflict(failure: unknown): boolean {
  return failure instanceof ApiError && failure.body.statusCode === 409;
}

function PaymentRecord({ payment, onOpenReceipt }: { payment: OfflinePaymentDto; onOpenReceipt(): void }) {
  const isVoided = payment.voidedAt !== null;
  return (
    <li>
      <Card padding="sm">
        <div className="mb-3 flex flex-wrap items-center gap-2.5">
          <span className="text-[15px] font-semibold">
            {`${PAYMENT_METHOD_LABELS[payment.method]} · ${formatOfflineAmount(payment.amount)}`}
          </span>
          {isVoided ? <StatusBadge label="Anulado" tone="neutral" /> : null}
        </div>
        <dl>
          <Row label="Registró">{whoAndWhen(payment.recordedBy, payment.recordedAt)}</Row>
          <Row label="Fecha del pago">{formatPaidOn(payment.paidOn)}</Row>
          {payment.note ? <Row label="Nota">{payment.note}</Row> : null}
          {payment.hasReceipt ? (
            <Row label="Comprobante">
              <button
                type="button"
                onClick={onOpenReceipt}
                className="min-h-11 underline underline-offset-2 hover:no-underline sm:min-h-0"
              >
                Ver comprobante
              </button>
            </Row>
          ) : null}
          {isVoided ? (
            <Row label="Anuló">{whoAndWhen(payment.voidedBy, payment.voidedAt, payment.voidReason)}</Row>
          ) : null}
        </dl>
      </Card>
    </li>
  );
}

export function OfflineChargeDetailPanel({ chargeId }: { chargeId: string }) {
  const { showSnackbar } = useSnackbar();
  // The panel owns the detail and swaps it for whatever each action answers.
  const [detail, setDetail] = useState<OfflineChargeDetailDto | null>(null);
  const [failure, setFailure] = useState<Failure | null>(null);
  const [isWaiveOpen, setIsWaiveOpen] = useState(false);

  function fetchCharge() {
    return getOfflineCharge(chargeId)
      .then((charge) => {
        setFailure(null);
        setDetail(charge);
      })
      .catch((error: unknown) => {
        setDetail(null);
        setFailure(error instanceof ApiError && error.body.statusCode === 404 ? "not-found" : "error");
      });
  }

  function retry() {
    setFailure(null);
    void fetchCharge();
  }

  useEffect(() => {
    void fetchCharge();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chargeId]);

  // A 409 means the charge changed under staff's feet: say what the backend said and show the real state.
  // Any other failure rejects, so the dialog stays open with what was typed.
  async function failAction(error: unknown, fallback: string): Promise<void> {
    if (isConflict(error)) {
      showSnackbar({ tone: "info", title: offlineErrorMessage(error, fallback) });
      await fetchCharge();
      return;
    }
    showSnackbar({ tone: "danger", title: offlineErrorMessage(error, fallback) });
    throw error;
  }

  async function submitWaive(reason: string): Promise<void> {
    try {
      setDetail(await waiveOfflineCharge(chargeId, reason));
      showSnackbar({ tone: "success", title: WAIVED_MESSAGE });
    } catch (error) {
      await failAction(error, WAIVE_FAILED_MESSAGE);
    }
  }

  async function viewReceipt(paymentId: string): Promise<void> {
    const opened = await openReceipt(() => getStaffReceiptLink(chargeId, paymentId));
    if (!opened) showSnackbar({ tone: "danger", title: RECEIPT_FAILED_MESSAGE });
  }

  if (failure === "not-found") {
    return (
      <>
        <StaffPageHeader title={PAGE_TITLE} breadcrumb={BREADCRUMB} />
        <Card padding="none">
          <EmptyState
            title="El cobro no existe."
            action={
              <Link href={ROUTES.STAFF_PAYMENTS} className="text-sm underline underline-offset-2 hover:no-underline">
                Volver a Pagos
              </Link>
            }
          />
        </Card>
      </>
    );
  }

  if (failure === "error") {
    return (
      <>
        <StaffPageHeader title={PAGE_TITLE} breadcrumb={BREADCRUMB} />
        <Card padding="none">
          <EmptyState
            title="No pudimos cargar el cobro"
            description="Puede ser un problema temporario del servidor."
            role="alert"
            action={
              <Button variant="secondary" touchTarget onClick={retry}>
                Reintentar
              </Button>
            }
          />
        </Card>
      </>
    );
  }

  if (!detail) return <StaffPageLoading title={PAGE_TITLE} breadcrumb={BREADCRUMB} />;

  const status = OFFLINE_CHARGE_STATUS[detail.status];
  const isPending = detail.status === "pending";
  const isClosed = detail.status === "cancelled" || detail.status === "waived";

  return (
    <>
      <StaffPageHeader
        title={`${PAGE_TITLE} · ${detail.client?.name ?? "Cliente"}`}
        breadcrumb={BREADCRUMB}
        action={
          <div className="flex flex-wrap gap-2">
            {isPending ? (
              <RecordPaymentButton
                charge={detail}
                onChanged={(next) => {
                  if (next) setDetail(next);
                  else void fetchCharge();
                }}
              />
            ) : null}
            {isPending && detail.slotStarted ? (
              <Button type="button" variant="secondary" size="sm" touchTarget onClick={() => setIsWaiveOpen(true)}>
                No se cobra
              </Button>
            ) : null}
          </div>
        }
      />

      <div className="space-y-8">
        <Card padding="sm">
          <dl>
            <Row label={detail.kind === "plan" ? PLAN_LABEL[planNoun(detail.service)] : "Reserva"}>{offlineChargeTitle(detail)}</Row>
            {detail.planStartsOn ? <Row label="Desde">{formatPaidOn(detail.planStartsOn)}</Row> : null}
            <Row label="Estado">
              <StatusBadge label={status.label} tone={status.tone} />
            </Row>
            <Row label="Medio">{PAYMENT_METHOD_LABELS[detail.paymentMethod]}</Row>
            <Row label="Monto">{formatOfflineAmount(detail.amount)}</Row>
            <Row label="Reservó">{whoAndWhen(detail.bookedBy, detail.createdAt) || "—"}</Row>
            {isClosed ? (
              <Row label="Cerrado">{whoAndWhen(detail.closedBy, detail.closedAt, detail.closeReason) || "—"}</Row>
            ) : null}
          </dl>
        </Card>

        {detail.payments.length > 0 ? (
          <section aria-labelledby="offline-charge-payments">
            <h2
              id="offline-charge-payments"
              className="mb-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted"
            >
              Pagos registrados
            </h2>
            <ul className="space-y-3">
              {detail.payments.map((payment) => (
                <PaymentRecord key={payment.id} payment={payment} onOpenReceipt={() => void viewReceipt(payment.id)} />
              ))}
            </ul>
          </section>
        ) : null}
      </div>

      {isWaiveOpen ? (
        <ReasonDialog
          title="¿Marcar que no se cobra?"
          description="El cobro se cierra y libera el lugar del tope. El cliente no ve nada."
          placeholder="Ej.: cortesía, no va a pagar"
          confirmLabel="No se cobra"
          tone="primary"
          onSubmit={submitWaive}
          onClose={() => setIsWaiveOpen(false)}
        />
      ) : null}
    </>
  );
}
