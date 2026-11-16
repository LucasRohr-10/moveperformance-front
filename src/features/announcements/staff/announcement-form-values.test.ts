import { describe, expect, it } from "vitest";

import type { AnnouncementDto } from "@/lib/api/types";

import { validateAnnouncementForm } from "./announcement-form-values";

const TODAY = "2026-10-27";

const EXPIRED: AnnouncementDto = {
  id: "a-1",
  body: "Cerramos el 15 de septiembre.",
  visibleUntil: "2026-09-15",
  createdAt: "2026-09-08T15:00:00.000Z",
  createdByName: "Valentina",
  updatedAt: "2026-09-08T15:00:00.000Z",
  updatedByName: null,
};

describe("validateAnnouncementForm", () => {
  it("accepts a message and a date of today or later", () => {
    expect(validateAnnouncementForm({ body: "Feriado", visibleUntil: TODAY }, TODAY)).toEqual({});
    expect(validateAnnouncementForm({ body: "Feriado", visibleUntil: "2026-11-03" }, TODAY)).toEqual({});
  });

  it("empty body", () => {
    expect(validateAnnouncementForm({ body: "   ", visibleUntil: TODAY }, TODAY).body).toBe("Escribí el mensaje.");
  });

  it("501 chars", () => {
    const body = "a".repeat(501);

    expect(validateAnnouncementForm({ body, visibleUntil: TODAY }, TODAY).body).toBe("Máximo 500 caracteres.");
  });

  it("500 chars after trimming the spaces", () => {
    const body = `  ${"a".repeat(500)}  `;

    expect(validateAnnouncementForm({ body, visibleUntil: TODAY }, TODAY).body).toBeUndefined();
  });

  it("missing date", () => {
    expect(validateAnnouncementForm({ body: "Feriado", visibleUntil: "" }, TODAY).visibleUntil).toBe("Elegí una fecha.");
  });

  it("past date on create", () => {
    expect(validateAnnouncementForm({ body: "Feriado", visibleUntil: "2026-10-26" }, TODAY).visibleUntil).toBe(
      "Elegí hoy o una fecha posterior.",
    );
  });

  it("unchanged past date on edit passes", () => {
    const values = { body: "Texto corregido", visibleUntil: EXPIRED.visibleUntil };

    expect(validateAnnouncementForm(values, TODAY, EXPIRED)).toEqual({});
  });

  it("changed past date on edit fails", () => {
    const values = { body: EXPIRED.body, visibleUntil: "2026-10-01" };

    expect(validateAnnouncementForm(values, TODAY, EXPIRED).visibleUntil).toBe("Elegí hoy o una fecha posterior.");
  });

  it("an expired announcement can be revived with a future date", () => {
    const values = { body: EXPIRED.body, visibleUntil: "2026-11-10" };

    expect(validateAnnouncementForm(values, TODAY, EXPIRED)).toEqual({});
  });
});
