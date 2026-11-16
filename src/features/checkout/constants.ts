export const PAYMENT_MODES = {
  ONE_TIME: "one_time",
  AUTO_DEBIT: "auto_debit",
  CASH: "cash",
  TRANSFER: "transfer",
} as const;

export type PaymentMode = (typeof PAYMENT_MODES)[keyof typeof PAYMENT_MODES];

// What a one-off checkout can be paid with: the debit has its own flow.
export type CheckoutPaymentMode = typeof PAYMENT_MODES.ONE_TIME | typeof PAYMENT_MODES.CASH | typeof PAYMENT_MODES.TRANSFER;

const OFFLINE_MODES: readonly PaymentMode[] = [PAYMENT_MODES.CASH, PAYMENT_MODES.TRANSFER];

// Cash and transfer are paid at MOVE: nothing goes through Mercado Pago.
export function isOfflineMode(mode: PaymentMode): mode is typeof PAYMENT_MODES.CASH | typeof PAYMENT_MODES.TRANSFER {
  return OFFLINE_MODES.includes(mode);
}

// The code the API answers when the client already has an authorized Performance debit.
export const AUTO_DEBIT_ACTIVE_CODE = "AUTO_DEBIT_ACTIVE";
