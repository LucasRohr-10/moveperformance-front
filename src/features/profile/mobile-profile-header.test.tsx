import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { InboxProvider } from "@/features/inbox";
import type { InboxState } from "@/features/inbox/use-inbox";
import { renderWithSnackbar } from "@/test/render-with-snackbar";

const pathname = vi.hoisted(() => ({ current: "/dashboard" }));
const inbox = vi.hoisted(
  (): InboxState => ({
    unreadCount: 0,
    list: { items: [] },
    loadList: () => Promise.resolve(),
    markRead: () => Promise.resolve(),
    openAction: () => {},
  }),
);

vi.mock("@/features/inbox/use-inbox", () => ({ useInbox: () => inbox }));

vi.mock("next/navigation", () => ({
  usePathname: () => pathname.current,
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }),
}));

import type { AuthenticatedUser } from "@/lib/session";

import { MobileProfileHeader } from "./mobile-profile-header";

const user: AuthenticatedUser = {
  id: "1",
  name: "Ana Perez",
  lastName: "Perez",
  email: "ana@move.uy",
  phone: "+59899123456",
  birthDate: "1990-03-12",
  role: "client",
};

const links = [
  { label: "Mi perfil", href: "/dashboard" },
  { label: "Reservar", href: "/bookings" },
];

function header(showNotifications?: boolean) {
  return (
    <InboxProvider>
      <MobileProfileHeader user={user} links={links} showNotifications={showNotifications} />
      <p>outside</p>
    </InboxProvider>
  );
}

function renderHeader() {
  return renderWithSnackbar(header());
}

describe("MobileProfileHeader", () => {
  it("opening the account dropdown closes the notifications dropdown and vice versa", async () => {
    renderHeader();
    const interactiveUser = userEvent.setup();

    await interactiveUser.click(screen.getByRole("button", { name: "Notificaciones" }));
    expect(screen.getByRole("dialog", { name: "Notificaciones" })).toBeDefined();

    await interactiveUser.click(screen.getByRole("button", { name: "Cuenta de Ana Perez" }));
    expect(screen.queryByRole("dialog", { name: "Notificaciones" })).toBeNull();
    expect(screen.getByRole("menu", { name: "Cuenta de Ana Perez" })).toBeDefined();
  });

  it("opening the menu closes an open dropdown", async () => {
    renderHeader();
    const interactiveUser = userEvent.setup();

    await interactiveUser.click(screen.getByRole("button", { name: "Cuenta de Ana Perez" }));
    await interactiveUser.click(screen.getByRole("button", { name: "Abrir menú" }));

    expect(screen.queryByRole("menu", { name: "Cuenta de Ana Perez" })).toBeNull();
    expect(screen.getByRole("navigation")).toBeDefined();
  });

  it("closes an open dropdown when clicking outside", async () => {
    renderHeader();
    const interactiveUser = userEvent.setup();

    await interactiveUser.click(screen.getByRole("button", { name: "Notificaciones" }));
    await interactiveUser.click(screen.getByText("outside"));

    expect(screen.queryByRole("dialog", { name: "Notificaciones" })).toBeNull();
  });

  it("closes an open dropdown on Escape and restores focus to its trigger", async () => {
    renderHeader();
    const interactiveUser = userEvent.setup();

    const trigger = screen.getByRole("button", { name: "Notificaciones" });
    await interactiveUser.click(trigger);
    await interactiveUser.keyboard("{Escape}");

    expect(screen.queryByRole("dialog", { name: "Notificaciones" })).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it("closes the open menu when the route changes", async () => {
    const { rerender } = renderHeader();
    const interactiveUser = userEvent.setup();

    await interactiveUser.click(screen.getByRole("button", { name: "Abrir menú" }));
    expect(screen.getByRole("navigation")).toBeDefined();

    pathname.current = "/bookings";
    rerender(header());

    expect(screen.queryByRole("navigation")).toBeNull();
  });

  it("without showNotifications the bell is not rendered", () => {
    renderWithSnackbar(header(false));

    expect(screen.queryByRole("button", { name: /Notificaciones/ })).toBeNull();
    expect(screen.getByRole("button", { name: "Cuenta de Ana Perez" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Abrir menú" })).toBeDefined();
  });
});
