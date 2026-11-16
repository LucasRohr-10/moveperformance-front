// @vitest-environment node
import { describe, expect, it } from "vitest";

import { deactivationPreviewLines } from "./deactivation-preview-lines";

const ENTRY_LINE = "No va a poder entrar a la app ni se le va a poder reservar.";
const NO_MAIL_LINE = "No le llega ningún mail ni aviso por las reservas canceladas.";

describe("deactivationPreviewLines", () => {
  it("lists what gets cancelled, in order, with the plural forms", () => {
    expect(deactivationPreviewLines({ upcomingBookings: 3, hasCurrentPlan: true, autoDebits: 1, recoverySessionsLeft: 0 })).toEqual([
      "Se cancelan 3 reservas futuras.",
      "El plan queda inactivo mientras esté de baja.",
      "Se cancela el débito automático.",
      ENTRY_LINE,
      NO_MAIL_LINE,
    ]);
  });

  it("uses the singular for one booking and says when there is no plan or debit", () => {
    expect(deactivationPreviewLines({ upcomingBookings: 1, hasCurrentPlan: false, autoDebits: 0, recoverySessionsLeft: 0 })).toEqual([
      "Se cancela 1 reserva futura.",
      "No tiene un plan vigente.",
      "No tiene débito automático.",
      ENTRY_LINE,
      NO_MAIL_LINE,
    ]);
  });

  it("says when there are no bookings and uses the plural for several debits", () => {
    expect(deactivationPreviewLines({ upcomingBookings: 0, hasCurrentPlan: false, autoDebits: 2, recoverySessionsLeft: 0 })).toEqual([
      "No tiene reservas futuras.",
      "No tiene un plan vigente.",
      "Se cancelan 2 débitos automáticos.",
      ENTRY_LINE,
      NO_MAIL_LINE,
    ]);
  });

  it("adds the Recovery line after the plan line for one session", () => {
    expect(deactivationPreviewLines({ upcomingBookings: 0, hasCurrentPlan: false, autoDebits: 0, recoverySessionsLeft: 1 })).toEqual([
      "No tiene reservas futuras.",
      "No tiene un plan vigente.",
      "Tiene 1 sesión de Recovery que queda sin usar mientras esté de baja. Si el paquete vence antes de reactivarlo, se pierde.",
      "No tiene débito automático.",
      ENTRY_LINE,
      NO_MAIL_LINE,
    ]);
  });

  it("uses the plural for several Recovery sessions", () => {
    expect(deactivationPreviewLines({ upcomingBookings: 2, hasCurrentPlan: true, autoDebits: 1, recoverySessionsLeft: 5 })).toEqual([
      "Se cancelan 2 reservas futuras.",
      "El plan queda inactivo mientras esté de baja.",
      "Tiene 5 sesiones de Recovery que quedan sin usar mientras esté de baja. Si algún paquete vence antes de reactivarlo, esas sesiones se pierden.",
      "Se cancela el débito automático.",
      ENTRY_LINE,
      NO_MAIL_LINE,
    ]);
  });
});
