import { describe, expect, it } from "vitest";

import { SETTING_FIELDS, SETTING_SECTIONS, settingKeysOf, settingLabel } from "./settings-fields";

describe("offline payments settings", () => {
  it("adds the section after the offline prices", () => {
    const sections = Object.keys(SETTING_SECTIONS);

    expect(sections.indexOf("offlinePayments")).toBe(sections.indexOf("offlinePrices") + 1);
    expect(SETTING_SECTIONS.offlinePayments).toEqual({
      title: "Pagos en efectivo o transferencia",
      description: "Vale para lo que compra el cliente y para lo que reserva Staff por fuera.",
    });
  });

  it("lists its five fields in the order the form shows them", () => {
    expect(settingKeysOf("offlinePayments")).toEqual([
      "offlineUnpaidLimit",
      "offlineDiscountEnabled",
      "offlineDiscountPercent",
      "transferEnabled",
      "transferDetails",
    ]);
  });

  it("names and describes each field", () => {
    expect(SETTING_FIELDS.offlineUnpaidLimit).toMatchObject({
      label: "Máximo de cosas sin pagar",
      description: "Planes, sesiones y turnos sin pagar que puede tener un cliente a la vez. Al llegar, no puede reservar más.",
      kind: "integer",
      range: { min: 1, max: 20 },
    });
    expect(SETTING_FIELDS.offlineDiscountEnabled).toMatchObject({ label: "Aplicar descuento", kind: "boolean" });
    expect(SETTING_FIELDS.offlineDiscountPercent).toMatchObject({
      label: "Descuento (%)",
      description: "Porcentaje entero. 10 = 10%.",
      kind: "optionalInteger",
      range: { min: 1, max: 100 },
      dependsOn: "offlineDiscountEnabled",
    });
    expect(SETTING_FIELDS.transferEnabled).toMatchObject({ label: "Aceptar transferencias", kind: "boolean" });
    expect(SETTING_FIELDS.transferDetails).toMatchObject({
      label: "Datos para transferir",
      description:
        "El cliente los ve tal cual al elegir Transferencia. Poné la cuenta y a qué WhatsApp mandar el comprobante.",
      kind: "text",
      dependsOn: "transferEnabled",
    });
  });

  it("labels a field without a unit by its name", () => {
    expect(settingLabel("offlineDiscountPercent")).toBe("Descuento (%)");
    expect(settingLabel("offlineUnpaidLimit")).toBe("Máximo de cosas sin pagar");
  });
});
