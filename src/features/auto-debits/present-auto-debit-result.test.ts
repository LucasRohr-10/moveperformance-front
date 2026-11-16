import { describe, expect, it } from "vitest";

import type { AutoDebitDto } from "@/lib/api/types";

import { presentAutoDebitResult } from "./present-auto-debit-result";

const debit = (overrides: Partial<AutoDebitDto> = {}): AutoDebitDto => ({
  id: "debit-1",
  externalReference: "ref-1",
  planId: "plan-mensual",
  planName: "Mensual",
  service: "performance",
  status: "authorized",
  amount: 3900,
  currency: "UYU",
  frequency: 1,
  frequencyType: "months",
  nextChargeOn: "2026-11-12",
  createdAt: "2026-10-12T10:00:00.000Z",
  cancelledAt: null,
  cancelReason: null,
  ...overrides,
});

const loaded = (overrides: Partial<AutoDebitDto> = {}, timedOut = false) =>
  ({ kind: "loaded", debit: debit(overrides), timedOut }) as const;

describe("presentAutoDebitResult", () => {
  it("shows the active debit with the amount of each charge and the next one", () => {
    const model = presentAutoDebitResult(loaded());

    expect(model.title).toBe("Débito automático activo");
    expect(model.details).toEqual([
      { label: "Plan", value: "Mensual" },
      { label: "Monto de cada cobro", value: "$ 3.900" },
      { label: "Próximo cobro", value: "12/11/2026" },
    ]);
    expect(model.action).toEqual({ label: "Ir a mi perfil", href: "/dashboard" });
    expect(model.isWaiting).toBe(false);
  });

  it("omits the next charge when the API has no date yet", () => {
    const labels = presentAutoDebitResult(loaded({ nextChargeOn: null })).details.map(({ label }) => label);

    expect(labels).toEqual(["Plan", "Monto de cada cobro"]);
  });

  it("waits for Mercado Pago while the debit is pending", () => {
    const model = presentAutoDebitResult(loaded({ status: "pending", nextChargeOn: null }));

    expect(model.title).toBe("Confirmando tu débito");
    expect(model.body).toBe("Estamos esperando la confirmación de Mercado Pago. No cierres esta página.");
    expect(model.isWaiting).toBe(true);
    expect(model.retryLabel).toBeNull();
  });

  it("never claims the debit is active once the polling gave up", () => {
    const model = presentAutoDebitResult(loaded({ status: "pending", nextChargeOn: null }, true));

    expect(model.title).toBe("Débito en proceso");
    expect(model.body).toBe("Mercado Pago todavía no confirmó tu débito. Puede tardar unos minutos.");
    expect(model.title.toLowerCase()).not.toContain("activo");
    expect(model.retryLabel).toBe("Intentar de nuevo");
    expect(model.isWaiting).toBe(false);
  });

  it("explains a cancelled debit and links back to the checkout of that plan", () => {
    const model = presentAutoDebitResult(loaded({ status: "cancelled", cancelReason: "provider" }));

    expect(model.title).toBe("Débito no activado");
    expect(model.body).toBe("El débito automático no se activó o fue cancelado.");
    expect(model.action).toEqual({ label: "Volver a intentar", href: "/checkout/plan/plan-mensual" });
  });

  it("presents a debit cancelled by a deactivation like any cancelled one", () => {
    const byClient = presentAutoDebitResult(loaded({ status: "cancelled", cancelReason: "client" }));
    const byDeactivation = presentAutoDebitResult(loaded({ status: "cancelled", cancelReason: "deactivated" }));

    expect(byDeactivation.title).toBe(byClient.title);
    expect(byDeactivation.body).toBe(byClient.body);
  });

  it("says the debit does not exist, without a retry", () => {
    const model = presentAutoDebitResult({ kind: "not-found" });

    expect(model.title).toBe("No encontramos el débito");
    expect(model.body).toBe("Revisá el link o volvé a tu perfil.");
    expect(model.action).toEqual({ label: "Ir a mi perfil", href: "/dashboard" });
    expect(model.retryLabel).toBeNull();
  });

  it("offers a retry when the first request failed", () => {
    const model = presentAutoDebitResult({ kind: "error" });

    expect(model.title).toBe("No pudimos consultar tu débito.");
    expect(model.retryLabel).toBe("Reintentar");
    expect(model.isAlert).toBe(true);
  });

  it("is waiting while the first answer is on its way", () => {
    expect(presentAutoDebitResult({ kind: "loading" })).toMatchObject({
      title: "Consultando tu débito…",
      isWaiting: true,
    });
  });
});
