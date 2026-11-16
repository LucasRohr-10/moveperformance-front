import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { InboxProvider } from "@/features/inbox";
import type { InboxState } from "@/features/inbox/use-inbox";
import type { InboxItemDto } from "@/lib/api/types";

import { NotificationsControl } from "./notifications-control";

const inbox = vi.hoisted(() => ({ current: null as unknown as InboxState }));

vi.mock("next/navigation", () => ({ usePathname: () => "/dashboard" }));
vi.mock("@/features/inbox/use-inbox", () => ({ useInbox: () => inbox.current }));

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

function setup(isOpen: boolean) {
  const onToggle = vi.fn();
  const triggerRef = createRef<HTMLButtonElement>();
  render(
    <InboxProvider>
      <NotificationsControl isOpen={isOpen} onToggle={onToggle} triggerRef={triggerRef} />
    </InboxProvider>,
  );
  return { onToggle, triggerRef };
}

describe("NotificationsControl", () => {
  beforeEach(() => {
    setInbox();
  });

  it("shows the unread badge and says the count in its label", () => {
    setup(false);

    const trigger = screen.getByRole("button", { name: "Notificaciones, 3 sin leer" });
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(trigger.textContent).toContain("3");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("has no badge and a plain label when everything is read", () => {
    setInbox({ unreadCount: 0 });
    setup(false);

    expect(screen.getByRole("button", { name: "Notificaciones" }).textContent).toBe("");
  });

  it("calls onToggle when the trigger is clicked", async () => {
    const { onToggle } = setup(false);

    await userEvent.setup().click(screen.getByRole("button", { name: /Notificaciones/ }));

    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it("open panel lists items", () => {
    setup(true);

    const panel = screen.getByRole("dialog", { name: "Notificaciones" });
    expect(panel.textContent).toContain("MOVE canceló tu turno");
    expect(panel.textContent).toContain("3 sin leer");
    expect(panel.textContent).not.toContain("Próximamente");
  });

  it("opening calls loadList", () => {
    setup(true);

    expect(inbox.current.loadList).toHaveBeenCalledTimes(1);
  });

  it("does not load the list while closed", () => {
    setup(false);

    expect(inbox.current.loadList).not.toHaveBeenCalled();
  });

  it("marks as read from the panel", async () => {
    setup(true);

    await userEvent.setup().click(screen.getByRole("button", { name: "Marcar como leído" }));

    expect(inbox.current.markRead).toHaveBeenCalledWith("notice:1");
  });

  it("the action opens its page and closes the panel", async () => {
    const { onToggle } = setup(true);

    await userEvent.setup().click(screen.getByRole("button", { name: "Reservar otro turno" }));

    expect(inbox.current.openAction).toHaveBeenCalledWith(ITEM);
    expect(onToggle).toHaveBeenCalledTimes(1);
  });
});
