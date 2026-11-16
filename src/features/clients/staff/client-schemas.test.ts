// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { clientPasswordSchema, clientProfileChanges, newClientSchema } from "./client-schemas";

const VALID = {
  name: " Ana ",
  lastName: "Gómez",
  birthDate: "1990-03-12",
  email: " Ana@Move.test ",
  phone: "099 123 456",
  password: "Clave-Segura1",
};

function messagesFor(input: Record<string, string>, field: string): string[] {
  const result = newClientSchema.safeParse(input);
  if (result.success) return [];
  return result.error.issues.filter((issue) => issue.path[0] === field).map((issue) => issue.message);
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-11-02T15:00:00.000Z"));
});
afterEach(() => vi.useRealTimers());

describe("newClientSchema", () => {
  it("accepts a complete client and normalizes it", () => {
    const result = newClientSchema.safeParse(VALID);

    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      name: "Ana",
      lastName: "Gómez",
      birthDate: "1990-03-12",
      email: "ana@move.test",
      phone: "+59899123456",
      password: "Clave-Segura1",
    });
  });

  it.each([
    ["name", { name: "" }, "Ingresá el nombre."],
    ["lastName", { lastName: "   " }, "Ingresá el apellido."],
    ["name", { name: "a".repeat(101) }, "Máximo 100 caracteres."],
    ["birthDate", { birthDate: "" }, "Ingresá la fecha de nacimiento."],
    ["birthDate", { birthDate: "2026-11-03" }, "Revisá la fecha de nacimiento."],
    ["birthDate", { birthDate: "1990-02-30" }, "Revisá la fecha de nacimiento."],
    ["email", { email: "no-es-email" }, "Ingresá un email válido."],
    ["phone", { phone: "099" }, "Ingresá un teléfono válido."],
    ["password", { password: "Abc123!" }, "La clave necesita al menos 8 caracteres."],
    ["password", { password: "a".repeat(129) }, "La clave puede tener hasta 128 caracteres."],
  ])("rejects an invalid %s", (field, override, message) => {
    expect(messagesFor({ ...VALID, ...override }, field)).toEqual([message]);
  });

  it("keeps the password as typed", () => {
    const result = newClientSchema.safeParse({ ...VALID, password: " Clave-Segura1 " });

    expect(result.data?.password).toBe(" Clave-Segura1 ");
  });
});

describe("clientPasswordSchema", () => {
  it("accepts 8 to 128 characters", () => {
    expect(clientPasswordSchema.safeParse("a".repeat(8)).success).toBe(true);
    expect(clientPasswordSchema.safeParse("a".repeat(128)).success).toBe(true);
    expect(clientPasswordSchema.safeParse("a".repeat(7)).success).toBe(false);
  });
});

describe("clientProfileChanges", () => {
  const initial = { name: "Ana", lastName: "Gómez", phone: "+59899123456", birthDate: "1990-03-12" };
  const same = { name: "Ana", lastName: "Gómez", phone: "099 123 456", birthDate: "1990-03-12" };

  it("returns only what changed", () => {
    expect(clientProfileChanges(initial, { ...same, lastName: "Pérez" })).toEqual({
      ok: true,
      changes: { lastName: "Pérez" },
    });
  });

  it("returns no changes when nothing changed", () => {
    // "099 123 456" and "+59899123456" are the same number.
    expect(clientProfileChanges(initial, same)).toEqual({ ok: true, changes: {} });
  });

  it("leaves out an empty last name or phone the client never had", () => {
    const bare = { name: "Ana", lastName: null, phone: null, birthDate: null };

    expect(clientProfileChanges(bare, { name: "Ana", lastName: "", phone: "", birthDate: "" })).toEqual({
      ok: true,
      changes: {},
    });
  });

  it("requires the name, and a last name or phone that existed", () => {
    const result = clientProfileChanges(initial, { name: "  ", lastName: "", phone: "", birthDate: "1990-03-12" });

    expect(result).toEqual({
      ok: false,
      errors: {
        name: "Ingresá el nombre.",
        lastName: "Ingresá el apellido.",
        phone: "Ingresá un teléfono válido.",
      },
    });
  });

  it("refuses a name longer than 100 characters and a phone that is not a phone", () => {
    const result = clientProfileChanges(initial, { ...same, name: "a".repeat(101), phone: "099" });

    expect(result).toEqual({
      ok: false,
      errors: { name: "Máximo 100 caracteres.", phone: "Ingresá un teléfono válido." },
    });
  });

  it("trims the names", () => {
    expect(clientProfileChanges(initial, { ...same, name: " Anita ", lastName: " Gómez " })).toEqual({
      ok: true,
      changes: { name: "Anita" },
    });
  });

  it("returns the phone as E.164 when it changed", () => {
    expect(clientProfileChanges(initial, { ...same, phone: "098 222 333" })).toEqual({
      ok: true,
      changes: { phone: "+59898222333" },
    });
  });

  it("returns the birth date when it changed", () => {
    expect(clientProfileChanges(initial, { ...same, birthDate: "1985-07-01" })).toEqual({
      ok: true,
      changes: { birthDate: "1985-07-01" },
    });
  });

  it("refuses a future or impossible date", () => {
    const revise = { ok: false, errors: { birthDate: "Revisá la fecha de nacimiento." } };

    expect(clientProfileChanges(initial, { ...same, birthDate: "2026-11-03" })).toEqual(revise);
    expect(clientProfileChanges(initial, { ...same, birthDate: "1990-02-30" })).toEqual(revise);
  });

  it("refuses clearing a birth date that existed", () => {
    expect(clientProfileChanges(initial, { ...same, birthDate: "" })).toEqual({
      ok: false,
      errors: { birthDate: "Ingresá la fecha de nacimiento." },
    });
  });

  it("accepts a first birth date for a client who had none", () => {
    const withoutDate = { ...initial, birthDate: null };

    expect(clientProfileChanges(withoutDate, { ...same, birthDate: "1990-03-12" })).toEqual({
      ok: true,
      changes: { birthDate: "1990-03-12" },
    });
  });
});
