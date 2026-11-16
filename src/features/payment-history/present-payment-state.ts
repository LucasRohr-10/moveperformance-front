// By path: these features' indexes also export client code or server-only code.
import { formatInstantDate, formatInstantDateTime } from "@/features/followup/followup-dates";
import { formatBusinessDate } from "@/features/subscriptions/present-subscriptions";
import type { DeliveredItemDto, MyPaymentDto, PaymentHistoryState } from "@/lib/api/types";

import { PAYMENT_METHOD_LABELS } from "@/features/payments/staff/offline-charge-labels";

import { declineMessage } from "./decline-reasons";
import type { PaymentNoteModel, PaymentRowModel, StatePresentation } from "./payment-card-model";

// A row whose data the API did not send is left out, so the rows are built as lists that can be spread.
const row = (label: string, value: string | null): PaymentRowModel[] => (value === null ? [] : [{ label, value }]);

// The date and the time joined by a dot, as in the approved mockup: "26/10/2026 · 10:14".
const HOUR_AND_MINUTE_LENGTH = "10:14".length;
const formatDateAndTime = (iso: string): string =>
  `${formatInstantDate(iso)} · ${formatInstantDateTime(iso).slice(-HOUR_AND_MINUTE_LENGTH)}`;

const dateTimeRow = (label: string, iso: string | null): PaymentRowModel[] =>
  row(label, iso === null ? null : formatDateAndTime(iso));

const operationRow = (payment: MyPaymentDto): PaymentRowModel[] => row("N.º de operación", payment.paymentId);

interface DeliveredPresentation {
  body: string | null;
  rows: PaymentRowModel[];
}

const NOTHING_DELIVERED: DeliveredPresentation = { body: null, rows: [] };

type DeliveredType = DeliveredItemDto["type"];
type DeliveredOf<T extends DeliveredType> = Extract<DeliveredItemDto, { type: T }>;

// One presenter per kind of delivery: a new kind is a new entry here and nowhere else.
const DELIVERED_PRESENTERS: { [T in DeliveredType]: (item: DeliveredOf<T>) => DeliveredPresentation } = {
  plan: (plan) => ({
    body: "Tu plan quedó activo.",
    rows: [
      ...row("Vigencia", `${formatBusinessDate(plan.startsOn)} → ${formatBusinessDate(plan.endsOn)}`),
      ...row("Sesiones incluidas", plan.sessionsTotal === null ? null : String(plan.sessionsTotal)),
    ],
  }),
  booking: (booking) => ({
    body: "Tu reserva quedó confirmada.",
    rows: dateTimeRow("Sesión reservada", booking.startsAt),
  }),
};

// What an approved purchase gave the client; generic over the kind so each presenter gets exactly its own delivery.
function presentDeliveredOfType<T extends DeliveredType>(type: T, item: DeliveredOf<T>): DeliveredPresentation {
  return DELIVERED_PRESENTERS[type](item);
}

function presentDelivered(delivered: DeliveredItemDto | null): DeliveredPresentation {
  if (delivered === null) return NOTHING_DELIVERED;
  return presentDeliveredOfType(delivered.type, delivered);
}

const note = (
  tone: PaymentNoteModel["tone"],
  icon: PaymentNoteModel["icon"],
  title: string,
  body: string | null,
): PaymentNoteModel => ({ tone, icon, title, body });

// Cash or transfer: the team recorded it (the API only sends those once they are paid).
export const isPaidOutsideTheApp = (payment: MyPaymentDto): boolean => payment.paymentMethod !== "mercado_pago";

const PAID_OUTSIDE_WORDS = { cash: "en efectivo", transfer: "por transferencia" } as const;

const FREE_AMOUNT = 0;

// A purchase that cost nothing (a 100 % discount) was settled by itself: nobody paid it and the team recorded nothing.
function presentCostNothing(payment: MyPaymentDto): StatePresentation {
  const delivered = presentDelivered(payment.delivered);
  const body = ["No hubo nada para pagar: la compra quedó paga sola.", delivered.body].filter(Boolean).join(" ");
  return {
    badge: { label: "Aprobado", tone: "success" },
    note: note("success", "check", "Compra sin costo", body),
    rows: [...delivered.rows, ...row("Medio", PAYMENT_METHOD_LABELS[payment.paymentMethod])],
  };
}

function presentPaidOutsideTheApp(payment: MyPaymentDto, method: keyof typeof PAID_OUTSIDE_WORDS): StatePresentation {
  if (payment.amount === FREE_AMOUNT) return presentCostNothing(payment);
  const delivered = presentDelivered(payment.delivered);
  const paidOn = payment.paidOn === null ? formatInstantDate(payment.createdAt) : formatBusinessDate(payment.paidOn);
  return {
    badge: { label: "Aprobado", tone: "success" },
    note: note(
      "success",
      "check",
      "Pago registrado",
      `Pagaste ${PAID_OUTSIDE_WORDS[method]} el ${paidOn}. Lo registró el equipo de MOVE.`,
    ),
    rows: [...delivered.rows, ...row("Medio", PAYMENT_METHOD_LABELS[method])],
  };
}

// One presenter per state: a new state is a new entry, never a branch in an existing one.
export const STATE_PRESENTERS: Record<PaymentHistoryState, (payment: MyPaymentDto) => StatePresentation> = {
  approved: (payment) => {
    if (payment.paymentMethod !== "mercado_pago") return presentPaidOutsideTheApp(payment, payment.paymentMethod);
    const delivered = presentDelivered(payment.delivered);
    return {
      badge: { label: "Aprobado", tone: "success" },
      note: note("success", "check", "Pago acreditado", delivered.body),
      rows: [...dateTimeRow("Aprobado el", payment.approvedAt), ...delivered.rows, ...operationRow(payment)],
    };
  },
  refunded: (payment) => ({
    badge: { label: "Reembolsado", tone: "info" },
    note: note("info", "undo", "Pago reembolsado", "Mercado Pago registró el reembolso de este cobro."),
    rows: [
      ...dateTimeRow("Cobrado el", payment.approvedAt),
      ...dateTimeRow("Reembolso registrado", payment.refundedAt),
      ...operationRow(payment),
    ],
  }),
  declined: (payment) => ({
    badge: { label: "Rechazado", tone: "danger" },
    note: note("danger", "cross", "No se pudo realizar el pago", declineMessage(payment.reasonCode)),
    rows: [...dateTimeRow("Intentado", payment.lastPaymentAt), ...operationRow(payment)],
  }),
  processing: (payment) => ({
    badge: { label: "En proceso", tone: "warning" },
    note: note(
      "warning",
      "spinner",
      "Confirmando tu pago",
      "Estamos esperando la confirmación de Mercado Pago. Puede tardar unos minutos.",
    ),
    rows: [...dateTimeRow("Intentado", payment.lastPaymentAt), ...operationRow(payment)],
  }),
  waiting: (payment) => ({
    badge: { label: "Pendiente", tone: "warning" },
    note: note("warning", "clock", "Pago sin completar", "Iniciaste el pago pero no se completó."),
    rows: dateTimeRow("Iniciado", payment.createdAt),
  }),
  to_pay: (payment) => ({
    badge: { label: "A pagar en MOVE", tone: "warning" },
    note: note(
      "warning",
      "clock",
      "Falta pagarlo en MOVE",
      "Pagalo en MOVE en efectivo o por transferencia. Cuando el equipo lo registre, lo vas a ver como pagado.",
    ),
    rows: [...dateTimeRow("Elegido el", payment.createdAt), ...row("Medio", PAYMENT_METHOD_LABELS[payment.paymentMethod])],
  }),
  expired: (payment) => ({
    badge: { label: "Vencido", tone: "neutral" },
    note: note("neutral", "calendar-x", "Compra vencida", "El pago no se completó a tiempo y la compra venció."),
    rows: dateTimeRow("Iniciado", payment.createdAt),
  }),
};
