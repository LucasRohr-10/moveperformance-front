import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./checkins-server-api", () => ({ getPendingCheckin: vi.fn() }));

import { getPendingCheckin } from "./checkins-server-api";
import { PendingCheckinSection } from "./pending-checkin-section";

const pendingMock = vi.mocked(getPendingCheckin);

describe("PendingCheckinSection", () => {
  beforeEach(() => {
    pendingMock.mockReset();
  });

  it("invites the client to answer the pending check-in", async () => {
    pendingMock.mockResolvedValue({ checkin: { id: "c-1", period: "2026-10", firstName: "Ana" } });

    render(await PendingCheckinSection());

    expect(screen.getByText("Tenés un check-in pendiente")).toBeDefined();
    expect(screen.getByText("Te toma 1 minuto y nos ayuda a acompañarte mejor.")).toBeDefined();
    expect(screen.getByRole("link", { name: "Responder check-in" }).getAttribute("href")).toBe("/check-in");
  });

  it("shows nothing when there is no pending check-in", async () => {
    pendingMock.mockResolvedValue({ checkin: null });

    const { container } = render(await PendingCheckinSection());

    expect(container.textContent).toBe("");
  });

  it("shows nothing when the API fails, so the rest of the page stays", async () => {
    pendingMock.mockRejectedValue(new Error("boom"));

    const { container } = render(await PendingCheckinSection());

    expect(container.textContent).toBe("");
  });
});
