import { describe, expect, it } from "vitest";

import {
  GENERIC_REJECTION_MESSAGE,
  REJECTION_REASON_MESSAGES,
  rejectionMessage,
} from "./payment-rejection-reasons";

describe("rejectionMessage", () => {
  it.each([
    ["cc_rejected_insufficient_amount", "Tu tarjeta no tiene fondos suficientes. Probá con otra tarjeta u otro medio de pago."],
    ["cc_rejected_bad_filled_security_code", "El código de seguridad no es correcto. Revisalo e intentá de nuevo."],
    ["cc_rejected_bad_filled_card_number", "El número de la tarjeta no es correcto. Revisalo e intentá de nuevo."],
    ["cc_rejected_bad_filled_other", "Algún dato de la tarjeta no es correcto. Revisalos e intentá de nuevo."],
    ["cc_rejected_bad_filled_date", "Revisá la fecha de vencimiento de la tarjeta. Si la tarjeta está vencida, probá con otra."],
    ["cc_rejected_card_disabled", "Tu tarjeta está deshabilitada. Llamá a tu banco para activarla o probá con otra."],
    [
      "cc_rejected_call_for_authorize",
      "Tu banco necesita que autorices el pago. Llamalo para autorizarlo y volvé a intentar, o probá con otra tarjeta.",
    ],
    ["cc_rejected_high_risk", "Por seguridad, Mercado Pago no pudo procesar el pago con esos datos. Probá con otro medio de pago."],
    ["cc_rejected_blacklist", "Por seguridad, Mercado Pago no pudo procesar el pago con esos datos. Probá con otro medio de pago."],
    [
      "cc_rejected_duplicated_payment",
      "Ya se hizo un pago por este mismo monto. Si querés volver a pagar, probá con otra tarjeta u otro medio de pago.",
    ],
    [
      "cc_amount_rate_limit_exceeded",
      "El monto supera el máximo que permite ese medio de pago. Probá con otra tarjeta u otro medio de pago.",
    ],
    [
      "cc_rejected_invalid_installments",
      "Esa tarjeta no admite la cantidad de cuotas elegida. Probá con otra cantidad de cuotas o con otra tarjeta.",
    ],
    ["cc_rejected_max_attempts", "Llegaste al máximo de intentos con esa tarjeta. Probá con otra tarjeta u otro medio de pago."],
    [
      "cc_rejected_3ds_mandatory",
      "Tu banco pide una verificación de seguridad que no se completó. Intentá de nuevo y completala, o probá con otra tarjeta.",
    ],
  ])("explains %s", (detail, message) => {
    expect(rejectionMessage(detail)).toBe(message);
  });

  it("keeps the generic text of today for a reason it does not know", () => {
    expect(GENERIC_REJECTION_MESSAGE).toBe("Mercado Pago no aprobó el pago. Podés intentarlo de nuevo.");
  });

  it.each([
    ["a reason Mercado Pago did not document for us", "cc_rejected_other_reason"],
    ["a card error", "cc_rejected_card_error"],
    ["a bank transfer rejection", "rejected_by_bank"],
    ["a code that is not Mercado Pago's", "cc_rejected_something_new_4111111111111111"],
    ["an inherited object key", "constructor"],
    ["another inherited object key", "__proto__"],
    ["an empty text", ""],
    ["no reason at all", null],
  ])("falls back to the generic text for %s", (_name, detail) => {
    expect(rejectionMessage(detail)).toBe(GENERIC_REJECTION_MESSAGE);
  });

  it("never shows a raw code, a digit or a mail, in any text", () => {
    for (const message of [GENERIC_REJECTION_MESSAGE, ...Object.values(REJECTION_REASON_MESSAGES)]) {
      expect(message).not.toMatch(/cc_|_rejected|\d|mail/i);
    }
  });
});
