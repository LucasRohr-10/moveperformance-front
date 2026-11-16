// @vitest-environment node
import { describe, expect, it } from "vitest";

import { MAX_OFFLINE_AMOUNT, formatAmountInput, parseOfflineAmount } from "./offline-amount";

describe("parseOfflineAmount", () => {
  it.each([
    ["1200", 1200],
    ["1200.5", 1200.5],
    ["1.200", 1200],
    ["1.200,50", 1200.5],
    ["1200,5", 1200.5],
    [" 900 ", 900],
    ["0", 0],
  ])("accepts %j as %d", (raw, value) => {
    expect(parseOfflineAmount(raw, true)).toEqual({ ok: true, value });
  });

  it("is null when empty and not required", () => {
    expect(parseOfflineAmount("  ", false)).toEqual({ ok: true, value: null });
  });

  it("asks for the amount when empty and required", () => {
    expect(parseOfflineAmount("", true)).toEqual({ ok: false, error: "Ingresá el monto que pagó." });
  });

  it.each([
    ["abc", "Ingresá un monto válido."],
    ["-5", "Ingresá un monto válido."],
    ["10,555", "Máximo 2 decimales."],
    ["100000,01", "El monto máximo es $ 100.000."],
  ])("rejects %j", (raw, error) => {
    expect(parseOfflineAmount(raw, true)).toEqual({ ok: false, error });
  });

  it("accepts exactly the maximum", () => {
    expect(MAX_OFFLINE_AMOUNT).toBe(100000);
    expect(parseOfflineAmount("100.000", true)).toEqual({ ok: true, value: 100000 });
  });
});

describe("formatAmountInput", () => {
  it("shows whole pesos without decimals and cents with a comma", () => {
    expect(formatAmountInput(1200)).toBe("1200");
    expect(formatAmountInput(1200.5)).toBe("1200,50");
  });
});
