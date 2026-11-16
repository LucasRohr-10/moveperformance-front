import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { BookingPlanBanner } from "./booking-plan-banner";
import type { SubscriptionsModel } from "./present-subscriptions";

const EMPTY_MODEL: SubscriptionsModel = {
  performance: null,
  upcoming: [],
  recoveryPacks: [],
  isEmpty: true,
};

describe("BookingPlanBanner", () => {
  it("renders nothing for rehab", () => {
    const { container } = render(<BookingPlanBanner model={EMPTY_MODEL} service="rehab" />);
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing while there is no model (anonymous visitor)", () => {
    const { container } = render(<BookingPlanBanner model={null} service="performance" />);
    expect(container.firstChild).toBeNull();
  });

  it("shows a 'ver planes' link when there is no plan for the service", () => {
    render(<BookingPlanBanner model={EMPTY_MODEL} service="performance" />);

    expect(screen.getByText("Sin plan activo.")).toBeDefined();
    expect(screen.getByRole("link", { name: "Ver planes" })).toBeDefined();
  });

  it("shows the plan line and badge when a performance plan exists", () => {
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

    render(<BookingPlanBanner model={model} service="performance" />);

    expect(screen.getByText("Plan Mensual")).toBeDefined();
    expect(screen.getByText("Vence 30/10")).toBeDefined();
    expect(screen.getByText("Activo")).toBeDefined();
  });
});
