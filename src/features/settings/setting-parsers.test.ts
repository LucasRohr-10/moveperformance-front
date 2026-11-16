import { describe, expect, it } from "vitest";

import { MAX_OFFLINE_AMOUNT, rangeError, relationErrors, SETTING_PARSERS } from "./setting-parsers";

describe("SETTING_PARSERS", () => {
  it("reads a whole number", () => {
    expect(SETTING_PARSERS.integer(" 14 ")).toEqual({ ok: true, value: 14 });
  });

  it.each(["", "abc", "2.5", "-1"])("rejects %j as a whole number", (text) => {
    expect(SETTING_PARSERS.integer(text)).toEqual({ ok: false, error: "Ingresá un número entero." });
  });

  it.each([
    ["0,5", 0.5],
    ["0.5", 0.5],
    ["1", 1],
    [" 0,25 ", 0.25],
  ])("reads the decimal %j", (text, value) => {
    expect(SETTING_PARSERS.decimal(text)).toEqual({ ok: true, value });
  });

  it.each(["", "abc", "-0,5", "0,5,1", ",5"])("rejects %j as a decimal", (text) => {
    expect(SETTING_PARSERS.decimal(text)).toEqual({ ok: false, error: "Ingresá un número (ej. 0,5)." });
  });

  describe("amount", () => {
    it.each([
      ["", null],
      ["   ", null],
      ["0", 0],
      ["1800", 1800],
      ["1200.5", 1200.5],
      ["1200,5", 1200.5],
      ["1.200", 1200],
      ["1.200,50", 1200.5],
      ["100000", 100000],
      [" 1800 ", 1800],
    ])("reads %j as %j", (text, value) => {
      expect(SETTING_PARSERS.amount(text)).toEqual({ ok: true, value });
    });

    it.each(["abc", "-5", "12,3,4", "$ 100"])("rejects %j as not a valid amount", (text) => {
      expect(SETTING_PARSERS.amount(text)).toEqual({ ok: false, error: "Ingresá un monto válido." });
    });

    it.each(["1,234", "1.2345", "10,123"])("rejects %j for its decimals", (text) => {
      expect(SETTING_PARSERS.amount(text)).toEqual({ ok: false, error: "Máximo 2 decimales." });
    });

    it.each(["100000,01", "100001", "1.200.000"])("rejects %j as above the maximum", (text) => {
      expect(MAX_OFFLINE_AMOUNT).toBe(100000);
      expect(SETTING_PARSERS.amount(text)).toEqual({ ok: false, error: "El monto máximo es $ 100.000." });
    });
  });

  describe("optionalInteger", () => {
    it.each([
      ["", null],
      ["   ", null],
      ["10", 10],
      [" 7 ", 7],
    ])("reads %j as %j", (text, value) => {
      expect(SETTING_PARSERS.optionalInteger(text)).toEqual({ ok: true, value });
    });

    it.each(["10,5", "abc", "-1", "2.5"])("rejects %j", (text) => {
      expect(SETTING_PARSERS.optionalInteger(text)).toEqual({ ok: false, error: "Ingresá un número entero." });
    });
  });

  describe("boolean", () => {
    it("reads the form's true and false", () => {
      expect(SETTING_PARSERS.boolean("true")).toEqual({ ok: true, value: true });
      expect(SETTING_PARSERS.boolean("false")).toEqual({ ok: true, value: false });
    });
  });

  describe("text", () => {
    it("trims the text", () => {
      expect(SETTING_PARSERS.text("  BROU  ")).toEqual({ ok: true, value: "BROU" });
    });

    it("reads an empty text as null", () => {
      expect(SETTING_PARSERS.text("")).toEqual({ ok: true, value: null });
      expect(SETTING_PARSERS.text("  \n ")).toEqual({ ok: true, value: null });
    });

    it("keeps the line breaks", () => {
      expect(SETTING_PARSERS.text("BROU\nWhatsApp 099")).toEqual({ ok: true, value: "BROU\nWhatsApp 099" });
    });

    it("accepts 500 characters and rejects 501", () => {
      expect(SETTING_PARSERS.text("x".repeat(500))).toEqual({ ok: true, value: "x".repeat(500) });
      expect(SETTING_PARSERS.text("x".repeat(501))).toEqual({ ok: false, error: "Hasta 500 caracteres." });
    });
  });
});

describe("relationErrors", () => {
  it("asks for the percentage when the discount is on and there is none", () => {
    expect(relationErrors({ offlineDiscountEnabled: true, offlineDiscountPercent: null })).toEqual({
      offlineDiscountPercent: "Poné el porcentaje de descuento.",
    });
  });

  it("lets the discount be on with a percentage, or off without one", () => {
    expect(relationErrors({ offlineDiscountEnabled: true, offlineDiscountPercent: 10 })).toEqual({});
    expect(relationErrors({ offlineDiscountEnabled: false, offlineDiscountPercent: null })).toEqual({});
  });

  it("asks for the details when transfers are on and there are none", () => {
    expect(relationErrors({ transferEnabled: true, transferDetails: null })).toEqual({
      transferDetails: "Escribí los datos para transferir.",
    });
  });

  it("lets transfers be on with details, or off without them", () => {
    expect(relationErrors({ transferEnabled: true, transferDetails: "BROU" })).toEqual({});
    expect(relationErrors({ transferEnabled: false, transferDetails: null })).toEqual({});
  });

  it("keeps the follow-up rule", () => {
    expect(relationErrors({ noAttendanceDays: 7, prolongedInactivityDays: 7 })).toEqual({
      prolongedInactivityDays: "Tiene que ser mayor que los días sin asistir.",
    });
  });
});

describe("rangeError", () => {
  it("says nothing for a value inside the range, or for a field without one", () => {
    expect(rangeError("integer", { min: 1, max: 20 }, 20)).toBeNull();
    expect(rangeError("optionalInteger", { min: 1, max: 100 }, 1)).toBeNull();
    expect(rangeError("integer", undefined, 999)).toBeNull();
  });

  it("lets an optional integer be empty", () => {
    expect(rangeError("optionalInteger", { min: 1, max: 100 }, null)).toBeNull();
  });

  it.each([0, 21])("asks for a whole number between 1 and 20 for %j", (value) => {
    expect(rangeError("integer", { min: 1, max: 20 }, value)).toBe("Tiene que ser un número entero entre 1 y 20.");
  });

  it.each([0, 101])("asks for a whole number between 1 and 100, or empty, for %j", (value) => {
    expect(rangeError("optionalInteger", { min: 1, max: 100 }, value)).toBe(
      "Tiene que ser un número entero entre 1 y 100, o vacío.",
    );
  });
});
