import { describe, expect, it } from "vitest";

import type { AlertDto } from "@/lib/api/types";

import { presentAlert } from "./present-alert";

const TODAY = "2026-10-26";

const baseAlert = {
  id: "alert-1",
  type: "expiring",
  status: "open",
  client: { id: "client-1", name: "Ana Pérez", initials: "AP", phone: null, email: "ana@example.com" },
  planName: "Mensual",
  endsOn: "2026-10-28",
  lastAttendanceOn: "2026-10-23",
  frequencyPerWeek: 2.5,
  usualFrequencyPerWeek: 3,
  contactsCount: 0,
  pause: null,
  checkin: null,
  createdAt: "2026-10-12T08:00:00.000Z",
} satisfies AlertDto;

const alertOf = (overrides: Partial<AlertDto>): AlertDto => ({ ...baseAlert, ...overrides });
const presentOf = (overrides: Partial<AlertDto>) => presentAlert(alertOf(overrides), TODAY);

describe("presentAlert", () => {
  it("renders an expiring alert as a row", () => {
    expect(presentAlert(baseAlert, TODAY)).toEqual({
      name: "Ana Pérez",
      initials: "AP",
      subtitle: "Plan Mensual",
      badge: { label: "Plan por vencer", tone: "warning" },
      headline: { kind: "fact", title: "Vence en 2 días", detail: "El plan Mensual vence el 28/10/2026." },
      lastAttendance: "23/10",
      actions: ["contact", "handle", "reason", "history"],
    });
  });

  it("says today and tomorrow on an expiring plan", () => {
    expect(presentOf({ endsOn: "2026-10-26" }).headline).toMatchObject({ title: "Vence hoy" });
    expect(presentOf({ endsOn: "2026-10-27" }).headline).toMatchObject({ title: "Vence mañana" });
  });

  it("falls back to a generic title when the expiring plan has no end date", () => {
    expect(presentOf({ endsOn: null }).headline).toEqual({ kind: "fact", title: "Plan por vencer", detail: null });
  });

  it("counts the days since the plan expired", () => {
    const expired = presentOf({ type: "expired", endsOn: "2026-10-22" });

    expect(expired.badge).toEqual({ label: "Vencido sin renovación", tone: "danger" });
    expect(expired.headline).toEqual({
      kind: "fact",
      title: "Venció hace 4 días",
      detail: "El plan Mensual venció el 22/10/2026 y no se renovó.",
    });
    expect(expired.actions).toContain("reason");
    expect(presentOf({ type: "expired", endsOn: "2026-10-25" }).headline).toMatchObject({ title: "Venció ayer" });
    expect(presentOf({ type: "expired", endsOn: "2026-10-26" }).headline).toMatchObject({ title: "Venció hoy" });
  });

  it("counts the days without attending and mentions the usual frequency", () => {
    const inactive = presentOf({
      type: "prolonged_inactivity",
      endsOn: null,
      lastAttendanceOn: "2026-10-01",
      usualFrequencyPerWeek: 0.3,
    });

    expect(inactive.badge).toEqual({ label: "Inactividad prolongada", tone: "danger" });
    expect(inactive.headline).toEqual({
      kind: "fact",
      title: "25 días sin asistir",
      detail: "Última asistencia el 01/10. Venía 0,3 veces por semana.",
    });
    expect(inactive.actions).toEqual(["contact", "handle", "reason", "history"]);
  });

  it("uses the singular for one day and one session a week", () => {
    const headline = presentOf({
      type: "no_attendance",
      endsOn: null,
      lastAttendanceOn: "2026-10-25",
      usualFrequencyPerWeek: 1,
    }).headline;

    expect(headline).toEqual({
      kind: "fact",
      title: "1 día sin asistir",
      detail: "Última asistencia el 25/10. Venía 1 vez por semana.",
    });
  });

  it("renders a no attendance alert with a neutral badge", () => {
    expect(presentOf({ type: "no_attendance", endsOn: null }).badge).toEqual({
      label: "1 semana sin asistir",
      tone: "neutral",
    });
  });

  it("says there are no attendances", () => {
    const model = presentOf({
      type: "prolonged_inactivity",
      lastAttendanceOn: null,
      usualFrequencyPerWeek: null,
    });

    expect(model.headline).toEqual({ kind: "fact", title: "Sin asistencias registradas", detail: null });
    expect(model.lastAttendance).toBeNull();
  });

  it("compares the frequency with the usual one", () => {
    const drop = presentOf({
      type: "frequency_drop",
      endsOn: null,
      frequencyPerWeek: 1,
      usualFrequencyPerWeek: 1.5,
    });

    expect(drop.badge).toEqual({ label: "Baja de frecuencia", tone: "warning" });
    expect(drop.headline).toEqual({
      kind: "fact",
      title: "Bajó de 1,5 a 1 por semana",
      detail: "Frecuencia de las últimas 4 semanas contra la habitual.",
    });
    expect(
      presentOf({ type: "frequency_drop", frequencyPerWeek: 1, usualFrequencyPerWeek: null }).headline,
    ).toEqual({ kind: "fact", title: "Frecuencia 1 por semana", detail: null });
  });

  it("shows the date a paused client asked to be contacted", () => {
    const recontact = presentOf({
      type: "recontact",
      planName: null,
      endsOn: null,
      pause: { reason: "vacation", since: "2026-10-26T12:00:00.000Z", recontactOn: "2026-10-26" },
    });

    expect(recontact.badge).toEqual({ label: "Re-contactar el 26/10/2026", tone: "neutral" });
    expect(recontact.subtitle).toBe("Pausa por vacaciones");
    expect(recontact.headline).toEqual({
      kind: "fact",
      title: "Pidió contacto para hoy",
      detail: "Pausa por vacaciones registrada el 26/10.",
    });
    expect(recontact.actions).toEqual(["contact", "handle", "history"]);
  });

  it("names another recontact date, and has a fallback when the pause has no date", () => {
    const pause = { reason: "injury", since: "2026-09-24T12:00:00.000Z" } as const;

    expect(presentOf({ type: "recontact", pause: { ...pause, recontactOn: "2026-11-01" } }).headline).toMatchObject({
      title: "Pidió contacto para el 01/11/2026",
    });
    expect(presentOf({ type: "recontact", pause: { ...pause, recontactOn: null } }).headline).toMatchObject({
      title: "Re-contactar",
    });
  });

  it("quotes the check-in answer", () => {
    const pain = presentOf({
      type: "checkin_pain",
      endsOn: null,
      checkin: { id: "c-1", painDetail: "Me molesta la rodilla izquierda al correr.", goalsDetail: null },
    });

    expect(pain.badge).toEqual({ label: "Molestia reportada", tone: "warning" });
    expect(pain.headline).toEqual({
      kind: "quote",
      text: "“Me molesta la rodilla izquierda al correr.”",
      detail: "Respondió en el check-in",
    });
    expect(pain.actions).toEqual(["contact", "handle", "history"]);
  });

  it("falls back to a fact when the check-in has no detail", () => {
    const pain = presentOf({ type: "checkin_pain", checkin: { id: "c-1", painDetail: null, goalsDetail: null } });
    const goals = presentOf({ type: "checkin_goals", checkin: { id: "c-1", painDetail: null, goalsDetail: null } });
    const goalsWithDetail = presentOf({
      type: "checkin_goals",
      checkin: { id: "c-1", painDetail: null, goalsDetail: "Quiero sumar fuerza." },
    });

    expect(pain.headline).toEqual({ kind: "fact", title: "Reportó una molestia en el check-in", detail: null });
    expect(goals.headline).toEqual({ kind: "fact", title: "Quiere ajustar sus objetivos", detail: null });
    expect(goals.badge).toEqual({ label: "Cambio de objetivos", tone: "warning" });
    expect(goalsWithDetail.headline).toMatchObject({ kind: "quote", text: "“Quiero sumar fuerza.”" });
  });

  it("adds the previous contacts to the subtitle", () => {
    expect(presentOf({ contactsCount: 2 }).subtitle).toBe("Plan Mensual · 2 contactos previos");
    expect(presentOf({ contactsCount: 1 }).subtitle).toBe("Plan Mensual · 1 contacto previo");
    expect(presentOf({ planName: null }).subtitle).toBe("Sin plan");
  });
});
