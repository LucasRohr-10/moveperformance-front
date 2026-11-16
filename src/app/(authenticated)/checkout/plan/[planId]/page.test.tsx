import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { renderWithSnackbar } from "@/test/render-with-snackbar";

import { USER_ROLES } from "@/config/constants/user-roles.constants";

vi.mock("@/lib/session", () => ({ requireRole: vi.fn() }));
vi.mock("@/features/checkout/plan-checkout", () => ({
  PlanCheckout: ({ planId }: { planId: string }) => <p>plan checkout {planId}</p>,
}));
vi.mock("@/features/checkout/checkout-message-card", () => ({ CheckoutSkeleton: () => <p>skeleton</p> }));

import { requireRole } from "@/lib/session";

import { PlanCheckoutContent } from "./page";

describe("PlanCheckoutContent", () => {
  it("is reserved for clients and renders the checkout of the plan in the URL", async () => {
    renderWithSnackbar(await PlanCheckoutContent({ params: Promise.resolve({ planId: "plan-1" }) }));

    expect(vi.mocked(requireRole)).toHaveBeenCalledWith(USER_ROLES.CLIENT);
    expect(screen.getByText("plan checkout plan-1")).toBeDefined();
  });
});
