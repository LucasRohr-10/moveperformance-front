import type {
  PaymentAttentionReason,
  PaymentOrigin,
  PurchaseKind,
  PurchaseStatus,
  ServiceType,
} from "@/lib/api/types";

export const STATUS_LABELS: Record<PurchaseStatus, string> = {
  pending: "Pendiente",
  approved: "Aprobado",
  rejected: "Rechazado",
  cancelled: "Cancelado",
  expired: "Expirado",
  waived: "No se cobra",
};

// Rejected is the only failure state; cancelled/expired are neutral outcomes, not errors.
export const STATUS_TONE: Record<PurchaseStatus, "success" | "warning" | "danger" | "neutral"> = {
  pending: "warning",
  approved: "success",
  rejected: "danger",
  cancelled: "neutral",
  expired: "neutral",
  waived: "neutral",
};

export const PURCHASE_STATUS_OPTIONS: readonly PurchaseStatus[] = [
  "pending",
  "approved",
  "rejected",
  "cancelled",
  "expired",
  "waived",
];

export const KIND_LABELS: Record<PurchaseKind, string> = {
  plan: "Plan",
  booking: "Reserva",
};

export const PURCHASE_KIND_OPTIONS: readonly PurchaseKind[] = ["plan", "booking"];

export const ORIGIN_LABELS: Record<PaymentOrigin, string> = {
  one_time: "Pago único",
  auto_debit: "Débito automático",
};

// Why a payment is flagged for review, when the backend says so.
export const ATTENTION_REASON_LABELS: Record<PaymentAttentionReason, string> = {
  booking_cancelled_by_staff: "Turno cancelado por staff",
  booking_cancelled_by_client: "Reserva cancelada por el cliente",
  offline_booking_cancelled: "Reserva por fuera cancelada",
};

// What staff has to do about a flag, shown under its note. Only the reasons that need instructions have one.
export const ATTENTION_REASON_HELP: Partial<Record<PaymentAttentionReason, string>> = {
  booking_cancelled_by_client:
    "Qué hacer: el cliente ya pagó y canceló. Devolverle la plata o usar ese pago para otro turno, y después tocar Marcar revisado.",
  offline_booking_cancelled:
    "Qué hacer: devolverle la plata o usar ese pago para otro turno, y después tocar Marcar revisado.",
};

export const PAYMENTS_VIEWS = { ALL: "all", TO_COLLECT: "to-collect" } as const;

export type PaymentsView = (typeof PAYMENTS_VIEWS)[keyof typeof PAYMENTS_VIEWS];

export const PAYMENT_ORIGIN_OPTIONS: readonly PaymentOrigin[] = ["one_time", "auto_debit"];

export const SERVICE_LABELS: Record<ServiceType, string> = {
  performance: "Performance",
  rehab: "Rehab",
  recovery: "Recovery",
};

export function isPurchaseStatus(value: string | undefined): value is PurchaseStatus {
  return value !== undefined && PURCHASE_STATUS_OPTIONS.some((status) => status === value);
}

export function isPurchaseKind(value: string | undefined): value is PurchaseKind {
  return value !== undefined && PURCHASE_KIND_OPTIONS.some((kind) => kind === value);
}

export function isPaymentOrigin(value: string | undefined): value is PaymentOrigin {
  return value !== undefined && PAYMENT_ORIGIN_OPTIONS.some((origin) => origin === value);
}

export function isPaymentsView(value: string | undefined): value is PaymentsView {
  return value !== undefined && Object.values<string>(PAYMENTS_VIEWS).includes(value);
}

export function parsePage(value: string | undefined): number {
  const page = Number(value);
  return Number.isInteger(page) && page > 0 ? page : 1;
}
