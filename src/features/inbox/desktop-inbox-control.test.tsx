import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { InboxItemDto } from "@/lib/api/types";

import { DesktopInboxControl } from "./desktop-inbox-control";
import { InboxProvider } from "./inbox-provider";
import type { InboxState } from "./use-inbox";

const pathname = vi.hoisted(() => ({ current: "/dashboard" }));
const inbox = vi.hoisted(() => ({ current: null as unknown as InboxState }));

vi.mock("next/navigation", () => ({ usePathname: () => pathname.current }));
vi.mock("./use-inbox", () => ({ useInbox: () => inbox.current }));

const ITEM: InboxItemDto = {
  id: "notice:1",
  source: "notice",
  type: "booking_cancelled_by_staff",
  title: "MOVE canceló tu turno",
  body: "Recovery · Miércoles 12 de noviembre · 09:00 a 09:45.",
  createdAt: "2026-10-27T13:42:00Z",
  readAt: null,
  action: { label: "Reservar otro turno", href: "/bookings?service=recovery" },
};

function setInbox(overrides: Partial<InboxState> = {}) {
  inbox.current = {
    unreadCount: 3,
    list: { items: [ITEM] },
    loadList: vi.fn().mockResolvedValue(undefined),
    markRead: vi.fn().mockResolvedValue(undefined),
    openAction: vi.fn(),
    ...overrides,
  };
}

function renderControl() {
  return render(
    <InboxProvider>
      <DesktopInboxControl />
      <p>outside</p>
    </InboxProvider>,
  );
}

describe("DesktopInboxControl", () => {
  beforeEach(() => {
    pathname.current = "/dashboard";
    setInbox();
  });

  it("button label includes the unread count", () => {
    renderControl();

    expect(screen.getByRole("button", { name: "Notificaciones, 3 sin leer" })).toBeDefined();
  });

  it("button label has no count when everything is read", () => {
    setInbox({ unreadCount: 0 });
    renderControl();

    expect(screen.getByRole("button", { name: "Notificaciones" })).toBeDefined();
  });

  it("shows the unread badge", () => {
    renderControl();

    expect(screen.getByRole("button").textContent).toContain("3");
  });

  it("opening calls loadList and shows the list", async () => {
    renderControl();
    expect(screen.queryByRole("dialog")).toBeNull();

    const trigger = screen.getByRole("button", { name: /Notificaciones/ });
    expect(trigger.getAttribute("aria-haspopup")).toBe("dialog");
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    await userEvent.setup().click(trigger);

    expect(inbox.current.loadList).toHaveBeenCalledTimes(1);
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    const panel = screen.getByRole("dialog", { name: "Notificaciones" });
    expect(panel.textContent).toContain("MOVE canceló tu turno");
    expect(panel.textContent).toContain("3 sin leer");
  });

  it("Escape closes and returns focus to the bell", async () => {
    const user = userEvent.setup();
    renderControl();
    const trigger = screen.getByRole("button", { name: /Notificaciones/ });
    await user.click(trigger);

    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it("click outside closes", async () => {
    const user = userEvent.setup();
    renderControl();
    await user.click(screen.getByRole("button", { name: /Notificaciones/ }));

    await user.click(screen.getByText("outside"));

    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("a click inside the panel keeps it open", async () => {
    const user = userEvent.setup();
    renderControl();
    await user.click(screen.getByRole("button", { name: /Notificaciones/ }));

    await user.click(screen.getByText("MOVE canceló tu turno"));

    expect(screen.getByRole("dialog")).toBeDefined();
  });

  it("closes when the page changes", async () => {
    const user = userEvent.setup();
    const { rerender } = renderControl();
    await user.click(screen.getByRole("button", { name: /Notificaciones/ }));

    pathname.current = "/plans";
    await act(async () => {
      rerender(
        <InboxProvider>
          <DesktopInboxControl />
          <p>outside</p>
        </InboxProvider>,
      );
    });

    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("marks as read from the panel", async () => {
    const user = userEvent.setup();
    renderControl();
    await user.click(screen.getByRole("button", { name: /Notificaciones/ }));

    await user.click(screen.getByRole("button", { name: "Marcar como leído" }));

    expect(inbox.current.markRead).toHaveBeenCalledWith("notice:1");
  });

  it("the action opens its page and closes the panel", async () => {
    const user = userEvent.setup();
    renderControl();
    await user.click(screen.getByRole("button", { name: /Notificaciones/ }));

    await user.click(screen.getByRole("button", { name: "Reservar otro turno" }));

    expect(inbox.current.openAction).toHaveBeenCalledWith(ITEM);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("Reintentar loads the list again", async () => {
    const user = userEvent.setup();
    setInbox({ list: "error" });
    renderControl();
    await user.click(screen.getByRole("button", { name: /Notificaciones/ }));

    await user.click(screen.getByRole("button", { name: "Reintentar" }));

    expect(inbox.current.loadList).toHaveBeenCalledTimes(2);
  });
});
