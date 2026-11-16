export const GENERIC_DECLINE_MESSAGE = "No pudimos procesar el pago. Probá de nuevo o con otra tarjeta.";

// Mercado Pago's `status_detail` for a rejected card payment, in words the client can act on.
const DECLINE_MESSAGES: Readonly<Record<string, string>> = {
  cc_rejected_insufficient_amount: "Tu tarjeta no tiene saldo suficiente.",
  cc_rejected_bad_filled_security_code: "El código de seguridad de la tarjeta es incorrecto.",
  cc_rejected_bad_filled_date: "La fecha de vencimiento de la tarjeta es incorrecta.",
  cc_rejected_bad_filled_card_number: "El número de la tarjeta es incorrecto.",
  cc_rejected_bad_filled_other: "Algún dato de la tarjeta es incorrecto.",
  cc_rejected_call_for_authorize: "Tu banco necesita que autorices el pago. Comunicate con él y probá de nuevo.",
  cc_rejected_card_disabled: "Tu tarjeta está inactiva. Activala con tu banco o usá otra.",
  cc_rejected_card_error: "No pudimos procesar tu tarjeta. Probá con otra.",
  cc_rejected_duplicated_payment: "Ya hiciste un pago igual hace poco.",
  cc_rejected_high_risk: "Mercado Pago rechazó el pago por seguridad. Probá con otro medio de pago.",
  cc_rejected_max_attempts: "Llegaste al máximo de intentos con esta tarjeta. Probá con otra.",
  cc_rejected_blacklist: "No pudimos procesar el pago con esta tarjeta. Probá con otra.",
  cc_rejected_invalid_installments: "Tu tarjeta no acepta esa cantidad de cuotas.",
  cc_rejected_other_reason: "Tu banco rechazó el pago. Probá con otra tarjeta o consultá con tu banco.",
};

// The client never sees the code itself: a missing or unknown one gets the generic message.
export function declineMessage(reasonCode: string | null): string {
  if (reasonCode === null || !Object.hasOwn(DECLINE_MESSAGES, reasonCode)) return GENERIC_DECLINE_MESSAGE;
  return DECLINE_MESSAGES[reasonCode];
}
