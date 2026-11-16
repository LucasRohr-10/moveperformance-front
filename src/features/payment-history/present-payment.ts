// By path: the staff payments feature's index also exports its client panel.
import { ORIGIN_LABELS, SERVICE_LABELS } from "@/features/payments/staff/staff-payments-labels";
import { formatInstantDate } from "@/features/followup/followup-dates";
import { PAYMENT_METHOD_LABELS } from "@/features/payments/staff/offline-charge-labels";
import { formatBusinessDate } from "@/features/subscriptions/present-subscriptions";
import type { MyPaymentDto, PaymentHistoryState } from "@/lib/api/types";
import { formatPrice } from "@/lib/money";

import type { PaymentCardModel } from "./payment-card-model";
import { STATE_PRESENTERS, isPaidOutsideTheApp } from "./present-payment-state";

// A purchase that never paid shows its amount struck through: it was not charged.
const MUTED_AMOUNT_STATES: readonly PaymentHistoryState[] = ["declined", "expired"];

// A payment recorded by the team is dated by the day the client paid, not by when it was recorded.
// One still to pay has no such day: it is dated by the day the client chose it.
function presentSubtitle(payment: MyPaymentDto): string {
  if (payment.state === "to_pay") return `${PAYMENT_METHOD_LABELS[payment.paymentMethod]} · ${formatInstantDate(payment.createdAt)}`;
  if (!isPaidOutsideTheApp(payment)) return `${ORIGIN_LABELS[payment.origin]} · ${formatInstantDate(payment.createdAt)}`;
  const paidOn = payment.paidOn === null ? formatInstantDate(payment.createdAt) : formatBusinessDate(payment.paidOn);
  return `${PAYMENT_METHOD_LABELS[payment.paymentMethod]} · ${paidOn}`;
}

export function presentPayment(payment: MyPaymentDto): PaymentCardModel {
  return {
    ...STATE_PRESENTERS[payment.state](payment),
    id: payment.id,
    title: `${SERVICE_LABELS[payment.service]} · ${payment.itemName}`,
    subtitle: presentSubtitle(payment),
    amount: formatPrice(payment.amount),
    isAmountMuted: MUTED_AMOUNT_STATES.includes(payment.state),
    icon: payment.origin === "auto_debit" ? "repeat" : "card",
    receiptPurchaseId: isPaidOutsideTheApp(payment) && payment.hasReceipt ? payment.id : null,
  };
}
