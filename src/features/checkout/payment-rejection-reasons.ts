export const GENERIC_REJECTION_MESSAGE = "Mercado Pago no aprobó el pago. Podés intentarlo de nuevo.";

const RISK_MESSAGE = "Por seguridad, Mercado Pago no pudo procesar el pago con esos datos. Probá con otro medio de pago.";

// Keyed by the `status_detail` Mercado Pago gives a rejected payment, checked against its Uruguay docs
// ("Resultados de cobro" and "Motivos de rechazo"). A code that is not here is not shown: it gets the generic text.
export const REJECTION_REASON_MESSAGES: Readonly<Record<string, string>> = {
  cc_rejected_insufficient_amount: "Tu tarjeta no tiene fondos suficientes. Probá con otra tarjeta u otro medio de pago.",
  cc_rejected_bad_filled_security_code: "El código de seguridad no es correcto. Revisalo e intentá de nuevo.",
  cc_rejected_bad_filled_card_number: "El número de la tarjeta no es correcto. Revisalo e intentá de nuevo.",
  cc_rejected_bad_filled_other: "Algún dato de la tarjeta no es correcto. Revisalos e intentá de nuevo.",
  // There is no "expired card" code: Mercado Pago reports it as a wrong expiration date.
  cc_rejected_bad_filled_date: "Revisá la fecha de vencimiento de la tarjeta. Si la tarjeta está vencida, probá con otra.",
  cc_rejected_card_disabled: "Tu tarjeta está deshabilitada. Llamá a tu banco para activarla o probá con otra.",
  cc_rejected_call_for_authorize:
    "Tu banco necesita que autorices el pago. Llamalo para autorizarlo y volvé a intentar, o probá con otra tarjeta.",
  cc_rejected_high_risk: RISK_MESSAGE,
  cc_rejected_blacklist: RISK_MESSAGE,
  cc_rejected_duplicated_payment:
    "Ya se hizo un pago por este mismo monto. Si querés volver a pagar, probá con otra tarjeta u otro medio de pago.",
  cc_amount_rate_limit_exceeded:
    "El monto supera el máximo que permite ese medio de pago. Probá con otra tarjeta u otro medio de pago.",
  cc_rejected_invalid_installments:
    "Esa tarjeta no admite la cantidad de cuotas elegida. Probá con otra cantidad de cuotas o con otra tarjeta.",
  cc_rejected_max_attempts: "Llegaste al máximo de intentos con esa tarjeta. Probá con otra tarjeta u otro medio de pago.",
  cc_rejected_3ds_mandatory:
    "Tu banco pide una verificación de seguridad que no se completó. Intentá de nuevo y completala, o probá con otra tarjeta.",
};

/** What to tell the client about a rejected payment. Never echoes the code it receives. */
export function rejectionMessage(statusDetail: string | null): string {
  if (statusDetail === null || !Object.hasOwn(REJECTION_REASON_MESSAGES, statusDetail)) return GENERIC_REJECTION_MESSAGE;
  return REJECTION_REASON_MESSAGES[statusDetail];
}
