import { describe, expect, it } from "vitest";

import { ALERT_TYPES } from "@/lib/api/types";

import {
  ALERT_LABELS,
  ALERT_ORDER,
  CHANNEL_LABELS,
  followUpRiskHref,
  isAlertType,
  OUTCOME_LABELS,
  PAUSE_LABELS,
  REASON_LABELS,
} from "./followup-labels";

describe("follow-up labels", () => {
  it("orders the chips by urgency (danger, warning, neutral), with every type once", () => {
    expect(ALERT_ORDER).toEqual([
      "expired",
      "prolonged_inactivity",
      "expiring",
      "frequency_drop",
      "checkin_pain",
      "checkin_goals",
      "no_attendance",
      "recontact",
    ]);
    expect([...ALERT_ORDER].sort()).toEqual(Object.values(ALERT_TYPES).sort());
  });

  it("names every alert type like moveAI", () => {
    expect(ALERT_ORDER.map((type) => ALERT_LABELS[type])).toEqual([
      "Vencidos sin renovar",
      "Inactividad prolongada",
      "Por vencer",
      "Baja de frecuencia",
      "Molestia reportada",
      "Cambio de objetivos",
      "1 semana sin asistir",
      "Re-contactar",
    ]);
  });

  it("names the channels, outcomes and reasons", () => {
    expect(CHANNEL_LABELS).toEqual({
      phone: "Teléfono",
      whatsapp: "WhatsApp",
      email: "Email",
      in_person: "En persona",
    });
    expect(OUTCOME_LABELS).toEqual({
      reached: "Habló con la persona",
      no_answer: "No respondió",
      left_message: "Dejé un mensaje",
    });
    expect(REASON_LABELS).toEqual({
      injury: "Lesión",
      vacation: "Vacaciones",
      temporary_pause: "Pausa temporal",
      no_time: "Falta de tiempo",
      moving: "Mudanza",
      return_later: "Quiere volver más adelante",
    });
  });

  it("names a pause the way the alert and the history say it", () => {
    expect(PAUSE_LABELS.injury).toBe("Pausa por lesión");
    expect(PAUSE_LABELS.return_later).toBe("Quiere volver más adelante");
  });

  it("falls back to all the alerts when the type is unknown", () => {
    expect(isAlertType("expiring")).toBe(true);
    expect(isAlertType("cualquiera")).toBe(false);
    expect(isAlertType(undefined)).toBe(false);
  });

  it("links to the clients at risk", () => {
    expect(followUpRiskHref()).toBe("/staff/follow-up?riesgo=true");
  });
});
