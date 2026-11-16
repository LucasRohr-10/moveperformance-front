import { describe, expect, it } from "vitest";

import type {
  MySubscriptionsDto,
  OfflineOptionsDto,
  PerformanceSubscriptionDto,
  RecoveryPackDto,
} from "@/lib/api/types";

import {
  dayAfter,
  daysLeftHeadline,
  daysLeftText,
  formatBusinessDate,
  packExpiryText,
  periodProgressPercent,
  presentSubscriptions,
} from "./present-subscriptions";

const performance = (overrides: Partial<PerformanceSubscriptionDto> = {}): PerformanceSubscriptionDto => ({
  id: "perf-1",
  planId: "plan-1",
  planName: "Trimestral",
  startsOn: "2026-08-15",
  endsOn: "2026-11-15",
  status: "active",
  daysLeft: 34,
  expiringSoon: false,
  purchaseId: null,
  awaitingPayment: false,
  ...overrides,
});

const pack = (overrides: Partial<RecoveryPackDto> = {}): RecoveryPackDto => ({
  id: "pack-1",
  planId: "plan-2",
  planName: "Paquete 4 sesiones",
  startsOn: "2026-10-10",
  endsOn: "2026-11-08",
  sessionsTotal: 4,
  sessionsUsed: 1,
  sessionsLeft: 3,
  daysLeft: 27,
  expiringSoon: false,
  purchaseId: null,
  awaitingPayment: false,
  ...overrides,
});

const dto = (overrides: Partial<MySubscriptionsDto> = {}): MySubscriptionsDto => ({
  performance: null,
  upcomingPerformances: [],
  recoveryPacks: [],
  ...overrides,
});

describe("packExpiryText", () => {
  it("counts the days left before the expiry date", () => {
    expect(packExpiryText(27, "2026-11-08")).toBe("Vence en 27 días · 08/11/2026");
  });

  it("says día in singular when one is left", () => {
    expect(packExpiryText(1, "2026-10-13")).toBe("Vence en 1 día · 13/10/2026");
  });

  it("says hoy on the last day", () => {
    expect(packExpiryText(0, "2026-10-12")).toBe("Vence hoy · 12/10/2026");
  });
});

describe("formatBusinessDate", () => {
  it("formats a contract date as dd/mm/aaaa", () => {
    expect(formatBusinessDate("2026-11-01")).toBe("01/11/2026");
    expect(formatBusinessDate("2026-01-09")).toBe("09/01/2026");
  });

  it.each(["UTC", "Pacific/Kiritimati", "America/Montevideo"])(
    "gives the same date when the process time zone is %s",
    (timeZone) => {
      const previous = process.env.TZ;
      process.env.TZ = timeZone;
      try {
        expect(formatBusinessDate("2026-11-01")).toBe("01/11/2026");
      } finally {
        if (previous === undefined) delete process.env.TZ;
        else process.env.TZ = previous;
      }
    },
  );
});

describe("dayAfter", () => {
  it("gives the next day, across month and year ends and leap days", () => {
    expect(dayAfter("2027-07-21")).toBe("2027-07-22");
    expect(dayAfter("2026-10-31")).toBe("2026-11-01");
    expect(dayAfter("2026-12-31")).toBe("2027-01-01");
    expect(dayAfter("2028-02-28")).toBe("2028-02-29");
    expect(dayAfter("2027-02-28")).toBe("2027-03-01");
  });

  it.each(["UTC", "Pacific/Kiritimati", "America/Montevideo"])(
    "gives the same day when the process time zone is %s",
    (timeZone) => {
      const previous = process.env.TZ;
      process.env.TZ = timeZone;
      try {
        expect(dayAfter("2026-11-01")).toBe("2026-11-02");
      } finally {
        if (previous === undefined) delete process.env.TZ;
        else process.env.TZ = previous;
      }
    },
  );
});

describe("daysLeftText", () => {
  it("says a plan ends today, in singular or in plural", () => {
    expect(daysLeftText(0)).toBe("Vence hoy");
    expect(daysLeftText(1)).toBe("1 día restante");
    expect(daysLeftText(34)).toBe("34 días restantes");
  });
});

describe("daysLeftHeadline", () => {
  it("splits the count in a big value and its caption, in singular or in plural", () => {
    expect(daysLeftHeadline(34)).toEqual({ value: "34", caption: "días restantes" });
    expect(daysLeftHeadline(1)).toEqual({ value: "1", caption: "día restante" });
  });

  it("says it is the last day instead of zero days left", () => {
    expect(daysLeftHeadline(0)).toEqual({ value: "Hoy", caption: "último día" });
  });
});

describe("periodProgressPercent", () => {
  it("rounds the elapsed share of the period, counting both end days", () => {
    expect(periodProgressPercent("2026-08-15", "2026-11-15", 34)).toBe(63);
  });

  it("is 100 on the last day", () => {
    expect(periodProgressPercent("2026-10-01", "2026-10-31", 0)).toBe(100);
  });

  it("never goes below 0 when daysLeft is larger than the period", () => {
    expect(periodProgressPercent("2026-10-01", "2026-10-31", 40)).toBe(0);
  });

  it("never goes above 100 when daysLeft is negative", () => {
    expect(periodProgressPercent("2026-10-01", "2026-10-31", -5)).toBe(100);
  });

  it("counts days across a year end", () => {
    expect(periodProgressPercent("2026-12-17", "2027-01-15", 15)).toBe(50);
  });
});

describe("presentSubscriptions", () => {
  describe("performance plan", () => {
    it("presents an active plan with its days left and the bar between its dates", () => {
      const model = presentSubscriptions(dto({ performance: performance() }));

      expect(model.performance).toEqual({
        title: "Plan Trimestral",
        badge: { label: "Activo", tone: "success" },
        progress: {
          percent: 63,
          label: "Progreso del período",
          valueText: "34 días restantes",
          daysLeftValue: "34",
          daysLeftCaption: "días restantes",
          daysLeftTone: "default",
          startText: "Inicio 15/08/2026",
          endText: "Vence 15/11/2026",
        },
        periodLine: null,
        renewal: null,
        expiredCta: null,
        unpaidLine: null,
        endsOn: "2026-11-15",
      });
    });

    it("warns when the back says the plan is expiring soon", () => {
      const model = presentSubscriptions(
        dto({ performance: performance({ daysLeft: 10, expiringSoon: true }) }),
      );

      expect(model.performance?.renewal).toEqual({ label: "Renovar plan", href: "/plans" });
      expect(model.performance?.badge).toEqual({ label: "Por vencer", tone: "warning" });
      expect(model.performance?.progress?.daysLeftTone).toBe("warning");
    });

    it("does not second-guess the back", () => {
      const model = presentSubscriptions(
        dto({ performance: performance({ daysLeft: 3, expiringSoon: false }) }),
      );

      expect(model.performance?.renewal).toBeNull();
      expect(model.performance?.badge).toEqual({ label: "Activo", tone: "success" });
      expect(model.performance?.progress?.daysLeftTone).toBe("default");
    });

    it("warns on the last day", () => {
      const model = presentSubscriptions(
        dto({ performance: performance({ daysLeft: 0, expiringSoon: true }) }),
      );

      expect(model.performance?.renewal).not.toBeNull();
      expect(model.performance?.progress?.daysLeftValue).toBe("Hoy");
    });

    it("never warns for an expired plan", () => {
      const model = presentSubscriptions(
        dto({ performance: performance({ status: "expired", daysLeft: 0, expiringSoon: false }) }),
      );

      expect(model.performance?.renewal).toBeNull();
    });

    it("presents a scheduled plan with its period line and no progress", () => {
      const model = presentSubscriptions(
        dto({ performance: performance({ status: "scheduled", startsOn: "2026-11-16", endsOn: "2027-02-16" }) }),
      );

      expect(model.performance).toEqual({
        title: "Plan Trimestral",
        badge: { label: "Próximo", tone: "warning" },
        progress: null,
        periodLine: { lead: "Empieza el 16/11/2026 · vence el ", emphasis: "16/02/2027" },
        renewal: null,
        expiredCta: null,
        unpaidLine: null,
        endsOn: "2027-02-16",
      });
    });

    it("presents an expired plan with its end date and no progress", () => {
      const model = presentSubscriptions(
        dto({ performance: performance({ status: "expired", daysLeft: 0 }) }),
      );

      expect(model.performance).toEqual({
        title: "Plan Trimestral",
        badge: { label: "Vencido", tone: "danger" },
        progress: null,
        periodLine: { lead: "Venció el ", emphasis: "15/11/2026" },
        renewal: null,
        expiredCta: {
          text: "Tu plan venció. Elegí uno nuevo para seguir reservando.",
          link: { label: "Ver planes", href: "/plans" },
        },
        unpaidLine: null,
        endsOn: "2026-11-15",
      });
    });

    it("offers no expired-plan action for an active or a scheduled plan", () => {
      const active = presentSubscriptions(dto({ performance: performance() }));
      const scheduled = presentSubscriptions(dto({ performance: performance({ status: "scheduled" }) }));

      expect(active.performance?.expiredCta).toBeNull();
      expect(scheduled.performance?.expiredCta).toBeNull();
    });

    it("does not repeat the word Plan when the plan name already starts with it", () => {
      const model = presentSubscriptions(dto({ performance: performance({ planName: "Plan Mensual" }) }));

      expect(model.performance?.title).toBe("Plan Mensual");
    });
  });

  describe("upcoming plans", () => {
    it("presents one queued plan, starting when the current one ends", () => {
      const model = presentSubscriptions(
        dto({
          performance: performance(),
          upcomingPerformances: [
            performance({ id: "u1", planName: "Semestral", status: "scheduled", startsOn: "2027-01-22", endsOn: "2027-07-21" }),
          ],
        }),
      );

      expect(model.upcoming).toEqual([
        {
          id: "u1",
          title: "Plan Semestral",
          badge: { label: "Ya pagado", tone: "info" },
          periodText: "Empieza el 22/01/2027, cuando termina tu plan actual · hasta 21/07/2027",
        },
      ]);
    });

    it("presents every queued plan in the order received, the later ones starting after the previous one", () => {
      const model = presentSubscriptions(
        dto({
          performance: performance(),
          upcomingPerformances: [
            performance({ id: "u1", planName: "Semestral", status: "scheduled", startsOn: "2027-01-22", endsOn: "2027-07-21" }),
            performance({ id: "u2", planName: "Mensual", status: "scheduled", startsOn: "2027-07-22", endsOn: "2027-08-21" }),
          ],
        }),
      );

      expect(model.upcoming.map(({ id }) => id)).toEqual(["u1", "u2"]);
      expect(model.upcoming[1].periodText).toBe(
        "Empieza el 22/07/2027, cuando termina el plan anterior · hasta 21/08/2027",
      );
    });

    it("is an empty list when nothing is queued", () => {
      expect(presentSubscriptions(dto({ performance: performance() })).upcoming).toEqual([]);
    });
  });

  describe("recovery packs", () => {
    it("presents a pack with sessions left, without a badge", () => {
      const model = presentSubscriptions(dto({ recoveryPacks: [pack()] }));

      expect(model.recoveryPacks).toEqual([
        {
          id: "pack-1",
          title: "Paquete 4 sesiones",
          badge: null,
          sessionsLeftValue: "3",
          sessionsTotalText: "de 4",
          sessionsCaption: "sesiones disponibles",
          segments: {
            total: 4,
            used: 1,
            label: "Sesiones usadas",
            valueText: "1 de 4 sesiones usadas",
          },
          startText: "Comprado 10/10/2026",
          endText: "Vence en 27 días · 08/11/2026",
          expiryTone: "default",
          renewal: null,
          unpaidLine: null,
          endsOn: "2026-11-08",
        },
      ]);
    });

    it("warns that a pack is about to expire when the API says so, with the renewal link", () => {
      const [model] = presentSubscriptions(
        dto({ recoveryPacks: [pack({ expiringSoon: true, daysLeft: 8, endsOn: "2026-10-20" })] }),
      ).recoveryPacks;

      expect(model.badge).toEqual({ label: "Por vencer", tone: "warning" });
      expect(model.renewal).toEqual({ label: "Renovar plan", href: "/plans" });
      expect(model.expiryTone).toBe("warning");
      expect(model.endText).toBe("Vence en 8 días · 20/10/2026");
    });

    it("does not warn when the API says no, however few days are left", () => {
      const [model] = presentSubscriptions(
        dto({ recoveryPacks: [pack({ expiringSoon: false, daysLeft: 3 })] }),
      ).recoveryPacks;

      expect(model.badge).toBeNull();
      expect(model.renewal).toBeNull();
      expect(model.expiryTone).toBe("default");
    });

    it("shows the expiring warning over the exhausted badge when the API flags a pack without sessions", () => {
      const [model] = presentSubscriptions(
        dto({ recoveryPacks: [pack({ sessionsUsed: 4, sessionsLeft: 0, expiringSoon: true, daysLeft: 8 })] }),
      ).recoveryPacks;

      expect(model.badge).toEqual({ label: "Por vencer", tone: "warning" });
    });

    it("keeps an exhausted pack as without sessions and shows its expiry", () => {
      const [model] = presentSubscriptions(
        dto({ recoveryPacks: [pack({ sessionsUsed: 4, sessionsLeft: 0, expiringSoon: false })] }),
      ).recoveryPacks;

      expect(model.badge).toEqual({ label: "Sin sesiones", tone: "danger" });
      expect(model.renewal).toBeNull();
      expect(model.endText).toBe("Vence en 27 días · 08/11/2026");
    });

    it("says sesión in singular when one is left", () => {
      const [model] = presentSubscriptions(
        dto({ recoveryPacks: [pack({ sessionsUsed: 3, sessionsLeft: 1 })] }),
      ).recoveryPacks;

      expect(model.sessionsCaption).toBe("sesión disponible");
    });

    it("presents a pack nobody used yet with every segment empty", () => {
      const [model] = presentSubscriptions(
        dto({ recoveryPacks: [pack({ sessionsUsed: 0, sessionsLeft: 4 })] }),
      ).recoveryPacks;

      expect(model.segments.used).toBe(0);
      expect(model.sessionsLeftValue).toBe("4");
    });

    it("presents an exhausted pack as without sessions, with every segment filled", () => {
      const [model] = presentSubscriptions(
        dto({ recoveryPacks: [pack({ sessionsUsed: 4, sessionsLeft: 0 })] }),
      ).recoveryPacks;

      expect(model.badge).toEqual({ label: "Sin sesiones", tone: "danger" });
      expect(model.sessionsLeftValue).toBe("0");
      expect(model.segments.used).toBe(4);
    });

    it("caps old data where the sessions left fall outside the pack", () => {
      const [negative] = presentSubscriptions(
        dto({ recoveryPacks: [pack({ sessionsTotal: 4, sessionsUsed: 5, sessionsLeft: -1 })] }),
      ).recoveryPacks;
      const [over] = presentSubscriptions(
        dto({ recoveryPacks: [pack({ sessionsTotal: 4, sessionsUsed: 0, sessionsLeft: 6 })] }),
      ).recoveryPacks;

      expect(negative.segments.used).toBe(4);
      expect(negative.badge).toEqual({ label: "Sin sesiones", tone: "danger" });
      expect(over.segments.used).toBe(0);
      expect(over.sessionsLeftValue).toBe("4");
    });

    it("keeps the order the API sent", () => {
      const model = presentSubscriptions(
        dto({ recoveryPacks: [pack({ id: "b" }), pack({ id: "a" }), pack({ id: "c" })] }),
      );

      expect(model.recoveryPacks.map(({ id }) => id)).toEqual(["b", "a", "c"]);
    });
  });

  describe("a service an authorized debit renews", () => {
    it("does not warn about a service an authorized debit renews", () => {
      const subscriptions = dto({
        performance: performance({ daysLeft: 3, expiringSoon: true }),
        recoveryPacks: [pack({ daysLeft: 3, expiringSoon: true })],
      });

      const performanceModel = presentSubscriptions(subscriptions, new Set(["performance"])).performance;
      const [packModel] = presentSubscriptions(subscriptions, new Set(["recovery"])).recoveryPacks;

      expect(performanceModel?.renewal).toBeNull();
      expect(performanceModel?.badge).toEqual({ label: "Activo", tone: "success" });
      expect(performanceModel?.progress?.daysLeftTone).toBe("default");
      expect(packModel.renewal).toBeNull();
      expect(packModel.badge).toBeNull();
      expect(packModel.expiryTone).toBe("default");
    });

    it("keeps warning about the other service", () => {
      const model = presentSubscriptions(
        dto({
          performance: performance({ daysLeft: 3, expiringSoon: true }),
          recoveryPacks: [pack({ daysLeft: 3, expiringSoon: true })],
        }),
        new Set(["recovery"]),
      );

      expect(model.performance?.renewal).toEqual({ label: "Renovar plan", href: "/plans" });
      expect(model.performance?.badge).toEqual({ label: "Por vencer", tone: "warning" });
      expect(model.recoveryPacks[0].renewal).toBeNull();
    });

    it("does not send a client whose debit renews Performance to buy another plan", () => {
      const subscriptions = dto({ performance: performance({ status: "expired", daysLeft: 0 }) });

      const renewed = presentSubscriptions(subscriptions, new Set(["performance"])).performance;
      const recoveryOnly = presentSubscriptions(subscriptions, new Set(["recovery"])).performance;

      expect(renewed?.expiredCta).toBeNull();
      expect(renewed?.badge).toEqual({ label: "Vencido", tone: "danger" });
      expect(renewed?.periodLine).toEqual({ lead: "Venció el ", emphasis: "15/11/2026" });
      expect(recoveryOnly?.expiredCta).toEqual({
        text: "Tu plan venció. Elegí uno nuevo para seguir reservando.",
        link: { label: "Ver planes", href: "/plans" },
      });
    });
  });

  describe("isEmpty", () => {
    it("is true with no plan and no packs", () => {
      const model = presentSubscriptions(dto());

      expect(model).toEqual({
        performance: null,
        upcoming: [],
        recoveryPacks: [],
        isEmpty: true,
      });
    });

    it("is false with only a plan or only a pack", () => {
      expect(presentSubscriptions(dto({ performance: performance() })).isEmpty).toBe(false);
      expect(presentSubscriptions(dto({ recoveryPacks: [pack()] })).isEmpty).toBe(false);
    });
  });
});

describe("presentSubscriptions · plans waiting for payment", () => {
  const unpaid = (overrides: Partial<OfflineOptionsDto["unpaid"]> = {}): OfflineOptionsDto["unpaid"] => ({
    count: 1,
    limit: 2,
    items: [
      { purchaseId: "pur-1", kind: "plan", label: "Plan mensual", amount: 2700, startsAt: null },
      { purchaseId: "pur-2", kind: "booking", label: "Evaluación", amount: 1350, startsAt: null },
    ],
    ...overrides,
  });
  const awaiting = performance({ purchaseId: "pur-1", awaitingPayment: true });

  it("marks the plan Sin pagar", () => {
    expect(presentSubscriptions(dto({ performance: awaiting })).performance?.badge).toEqual({
      label: "Sin pagar",
      tone: "warning",
    });
  });

  it("puts Sin pagar before Por vencer", () => {
    const model = presentSubscriptions(
      dto({ performance: { ...awaiting, daysLeft: 3, expiringSoon: true } }),
    );

    expect(model.performance?.badge).toEqual({ label: "Sin pagar", tone: "warning" });
  });

  it.each([
    ["expired", { status: "expired" as const, daysLeft: 0 }, { label: "Vencido", tone: "danger" }],
    ["scheduled", { status: "scheduled" as const }, { label: "Próximo", tone: "warning" }],
  ])("keeps the %s badge of a plan that is not current and does not promise turns", (_name, overrides, badge) => {
    const model = presentSubscriptions(
      dto({ performance: performance({ ...awaiting, ...overrides }) }),
      new Set(),
      unpaid(),
    );

    expect(model.performance?.badge).toEqual(badge);
    expect(model.performance?.unpaidLine).toBe("Pagalo en MOVE ($ 2.700).");
  });

  it("says what to pay and how many turns are left under the cap", () => {
    const model = presentSubscriptions(dto({ performance: awaiting }), new Set(), unpaid());

    expect(model.performance?.unpaidLine).toBe("Pagalo en MOVE ($ 2.700). Mientras tanto, podés reservar 1 turno más.");
  });

  it("uses the plural when more turns are left", () => {
    const model = presentSubscriptions(dto({ performance: awaiting }), new Set(), unpaid({ count: 1, limit: 3 }));

    expect(model.performance?.unpaidLine).toBe("Pagalo en MOVE ($ 2.700). Mientras tanto, podés reservar 2 turnos más.");
  });

  it("says no more turns can be booked when the cap is reached", () => {
    const model = presentSubscriptions(dto({ performance: awaiting }), new Set(), unpaid({ count: 2 }));

    expect(model.performance?.unpaidLine).toBe("Pagalo en MOVE ($ 2.700). Mientras tanto, no podés reservar más turnos.");
  });

  it("only says to pay when the options could not be read", () => {
    expect(presentSubscriptions(dto({ performance: awaiting })).performance?.unpaidLine).toBe("Pagalo en MOVE.");
  });

  it("leaves the amount out when the item has none or is not in the list", () => {
    const noAmount = unpaid({ items: [{ purchaseId: "pur-1", kind: "plan", label: "Plan", amount: null, startsAt: null }] });

    expect(presentSubscriptions(dto({ performance: awaiting }), new Set(), noAmount).performance?.unpaidLine).toBe(
      "Pagalo en MOVE. Mientras tanto, podés reservar 1 turno más.",
    );
    expect(presentSubscriptions(dto({ performance: awaiting }), new Set(), unpaid({ items: [] })).performance?.unpaidLine).toBe(
      "Pagalo en MOVE. Mientras tanto, podés reservar 1 turno más.",
    );
  });

  it("does not take the amount of a booking item with the same purchase", () => {
    const items = [{ purchaseId: "pur-1", kind: "booking" as const, label: "x", amount: 99, startsAt: null }];

    expect(
      presentSubscriptions(dto({ performance: awaiting }), new Set(), unpaid({ items })).performance?.unpaidLine,
    ).toBe("Pagalo en MOVE. Mientras tanto, podés reservar 1 turno más.");
  });

  it("marks a queued plan Sin pagar instead of Ya pagado", () => {
    const model = presentSubscriptions(dto({ upcomingPerformances: [awaiting] }));

    expect(model.upcoming[0]?.badge).toEqual({ label: "Sin pagar", tone: "warning" });
  });

  it("marks a Recovery pack Sin pagar, also when it is about to expire", () => {
    const model = presentSubscriptions(
      dto({ recoveryPacks: [pack({ purchaseId: "pur-1", awaitingPayment: true, expiringSoon: true })] }),
      new Set(),
      unpaid(),
    );

    expect(model.recoveryPacks[0]?.badge).toEqual({ label: "Sin pagar", tone: "warning" });
    expect(model.recoveryPacks[0]?.unpaidLine).toBe("Pagalo en MOVE ($ 2.700). Mientras tanto, podés reservar 1 turno más.");
  });

  it("has no unpaid line on a paid plan or pack", () => {
    const model = presentSubscriptions(dto({ performance: performance(), recoveryPacks: [pack()] }), new Set(), unpaid());

    expect(model.performance?.unpaidLine).toBeNull();
    expect(model.recoveryPacks[0]?.unpaidLine).toBeNull();
  });
});
