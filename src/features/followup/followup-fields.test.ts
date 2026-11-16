import { describe, expect, it } from "vitest";

import { parseNote, parseRecontactOn } from "./followup-fields";

describe("parseNote", () => {
  it("trims the text and leaves it out when it is empty", () => {
    expect(parseNote("  Llamé a las 18  ")).toEqual({ ok: true, value: "Llamé a las 18" });
    expect(parseNote("   ")).toEqual({ ok: true, value: undefined });
  });

  it("accepts up to 1000 characters", () => {
    expect(parseNote("a".repeat(1000))).toMatchObject({ ok: true });
  });

  it("rejects a note over 1000 characters", () => {
    expect(parseNote("a".repeat(1001))).toEqual({
      ok: false,
      error: "La nota es demasiado larga (máximo 1000 caracteres).",
    });
  });

  it("rejects a note with forbidden characters", () => {
    expect(parseNote("hola\u0000")).toEqual({ ok: false, error: "La nota contiene caracteres no permitidos." });
  });
});

describe("parseRecontactOn", () => {
  const TODAY = "2026-10-12";

  it("leaves the date out when it is empty", () => {
    expect(parseRecontactOn("", TODAY)).toEqual({ ok: true, value: undefined });
  });

  it("accepts today and a later date", () => {
    expect(parseRecontactOn("2026-10-12", TODAY)).toEqual({ ok: true, value: "2026-10-12" });
    expect(parseRecontactOn("2026-11-01", TODAY)).toEqual({ ok: true, value: "2026-11-01" });
  });

  it("rejects a date before today", () => {
    expect(parseRecontactOn("2026-10-11", TODAY)).toEqual({
      ok: false,
      error: "La fecha de re-contacto no puede ser anterior a hoy.",
    });
  });

  it("rejects a text that is not a date", () => {
    expect(parseRecontactOn("mañana", TODAY)).toEqual({ ok: false, error: "Ingresá una fecha válida." });
  });
});
