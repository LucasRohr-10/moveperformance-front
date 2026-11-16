import { describe, expect, it } from "vitest";

import { ROUTES } from "@/config/constants/routes.constants";

import { presentBookingPlanBanner } from "./present-booking-plan-banner";
import type { SubscriptionsModel } from "./present-subscriptions";

const EMPTY_MODEL: SubscriptionsModel = {
  performance: null,
  upcoming: [],
  recoveryPacks: [],
  isEmpty: true,
};

describe("presentBookingPlanBanner", () => {
  it("is null for rehab — rehab never had a plan concept", () => {
    expect(presentBookingPlanBanner(EMPTY_MODEL, "rehab")).toBeNull();
  });

  it("is null for an anonymous visitor (no model yet)", () => {
    expect(presentBookingPlanBanner(null, "performance")).toBeNull();
  });

  it("offers a 'ver planes' CTA when there is no performance plan", () => {
    const banner = presentBookingPlanBanner(EMPTY_MODEL, "performance");

    expect(banner?.lines).toEqual([]);
    expect(banner?.emptyCta).toEqual({ text: "Sin plan activo.", href: ROUTES.PLANS });
  });

  it("shows the active performance plan's title, end date and badge", () => {
    const model: SubscriptionsModel = {
      ...EMPTY_MODEL,
      performance: {
        title: "Plan Mensual",
        badge: { label: "Activo", tone: "success" },
        progress: {
          percent: 50,
          label: "Progreso del período",
          valueText: "10 días restantes",
          daysLeftValue: "10",
          daysLeftCaption: "días restantes",
          daysLeftTone: "default",
          startText: "Inicio 01/10",
          endText: "Vence 30/10",
        },
        periodLine: null,
        renewal: null,
        expiredCta: null,
        unpaidLine: null,
        endsOn: "2026-10-30",
      },
      isEmpty: false,
    };

    const banner = presentBookingPlanBanner(model, "performance");

    expect(banner?.lines).toEqual([
      {
        id: "performance",
        title: "Plan Mensual",
        detail: "Vence 30/10",
        sessions: null,
        badge: { label: "Activo", tone: "success" },
      },
    ]);
    expect(banner?.emptyCta).toBeNull();
  });

  it("falls back to the period line when the plan is scheduled or expired (no progress bar)", () => {
    const model: SubscriptionsModel = {
      ...EMPTY_MODEL,
      performance: {
        title: "Plan Mensual",
        badge: { label: "Vencido", tone: "danger" },
        progress: null,
        periodLine: { lead: "Venció el ", emphasis: "15/10" },
        renewal: null,
        expiredCta: { text: "Tu plan venció.", link: { label: "Ver planes", href: ROUTES.PLANS } },
        unpaidLine: null,
        endsOn: "2026-10-15",
      },
      isEmpty: false,
    };

    const banner = presentBookingPlanBanner(model, "performance");

    expect(banner?.lines).toEqual([
      {
        id: "performance",
        title: "Plan Mensual",
        detail: "Venció el 15/10",
        sessions: null,
        badge: { label: "Vencido", tone: "danger" },
      },
    ]);
  });

  it("offers a 'ver planes' CTA when there are no recovery packs", () => {
    const banner = presentBookingPlanBanner(EMPTY_MODEL, "recovery");

    expect(banner?.emptyCta).toEqual({ text: "Sin plan activo.", href: ROUTES.PLANS });
  });

  it("shows one line per recovery pack, each with its own sessions-left and badge", () => {
    const model: SubscriptionsModel = {
      ...EMPTY_MODEL,
      recoveryPacks: [
        {
          id: "p1",
          title: "Pack Recovery",
          badge: null,
          sessionsLeftValue: "3",
          sessionsTotalText: "de 5",
          sessionsCaption: "sesiones disponibles",
          segments: { total: 5, used: 2, label: "Sesiones usadas", valueText: "2 de 5" },
          startText: "Comprado 01/10",
          endText: "Vence en 10 días · 31/10",
          expiryTone: "default",
          renewal: null,
          unpaidLine: null,
          endsOn: "2026-10-31",
        },
        {
          id: "p2",
          title: "Pack Recovery",
          badge: { label: "Sin sesiones", tone: "danger" },
          sessionsLeftValue: "0",
          sessionsTotalText: "de 4",
          sessionsCaption: "sesiones disponibles",
          segments: { total: 4, used: 4, label: "Sesiones usadas", valueText: "4 de 4" },
          startText: "Comprado 01/09",
          endText: "Vence en 2 días · 20/10",
          expiryTone: "warning",
          renewal: null,
          unpaidLine: null,
          endsOn: "2026-10-20",
        },
      ],
      isEmpty: false,
    };

    const banner = presentBookingPlanBanner(model, "recovery");

    expect(banner?.lines).toEqual([
      {
        id: "p1",
        title: "Pack Recovery",
        detail: "",
        sessions: { leftValue: "3", totalText: "de 5", caption: "sesiones disponibles", remainingPercent: 60 },
        badge: { label: "Activo", tone: "success" },
      },
      {
        id: "p2",
        title: "Pack Recovery",
        detail: "",
        sessions: { leftValue: "0", totalText: "de 4", caption: "sesiones disponibles", remainingPercent: 0 },
        badge: { label: "Sin sesiones", tone: "danger" },
      },
    ]);
  });
});
