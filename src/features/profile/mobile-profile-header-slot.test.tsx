import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { InboxProvider } from "@/features/inbox";
import type { InboxState } from "@/features/inbox/use-inbox";
import { renderWithSnackbar } from "@/test/render-with-snackbar";

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

vi.mock("@/lib/session", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/session")>()),
  getCurrentUser: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }),
}));

import { getCurrentUser, SessionUnavailableError } from "@/lib/session";

import { MobileProfileHeaderSlotContent } from "./mobile-profile-header-slot";

const getCurrentUserMock = vi.mocked(getCurrentUser);
const links = [{ label: "Mi perfil", href: "/dashboard" }];

describe("MobileProfileHeaderSlotContent", () => {
  it("renders the full mobile header when there is a signed-in user", async () => {
    getCurrentUserMock.mockResolvedValue({
      id: "1",
      name: "Ana Perez",
      lastName: "Perez",
      email: "ana@move.uy",
      phone: "+59899123456",
      birthDate: "1990-03-12",
      role: "client",
    });

    renderWithSnackbar(<InboxProvider>{await MobileProfileHeaderSlotContent({ links })}</InboxProvider>);

    expect(screen.getByRole("button", { name: "Cuenta de Ana Perez" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Notificaciones" })).toBeDefined();
  });

  it("forwards showNotifications to leave the bell out (the staff has no notices)", async () => {
    getCurrentUserMock.mockResolvedValue({
      id: "1",
      name: "Lucía Staff",
      lastName: "Staff",
      email: "lucia@move.uy",
      phone: "+59899234567",
      birthDate: null,
      role: "staff",
    });

    renderWithSnackbar(await MobileProfileHeaderSlotContent({ links, showNotifications: false }));

    expect(screen.getByRole("button", { name: "Cuenta de Lucía Staff" })).toBeDefined();
    expect(screen.queryByRole("button", { name: /Notificaciones/ })).toBeNull();
  });

  it("forwards showPlan and settingsHref through to the account dropdown (e.g. for Staff, which has no plan but a real settings page)", async () => {
    getCurrentUserMock.mockResolvedValue({
      id: "1",
      name: "Lucía Staff",
      lastName: "Staff",
      email: "lucia@move.uy",
      phone: "+59899234567",
      birthDate: null,
      role: "staff",
    });

    renderWithSnackbar(
      await MobileProfileHeaderSlotContent({
        links,
        showPlan: false,
        showNotifications: false,
        settingsHref: "/staff/settings",
      }),
    );

    await import("@testing-library/user-event").then(({ default: userEvent }) =>
      userEvent.setup().click(screen.getByRole("button", { name: "Cuenta de Lucía Staff" })),
    );

    expect(screen.queryByText("Plan")).toBeNull();
    const ajustes = screen.getByRole("menuitem", { name: "Ajustes" });
    expect(ajustes.getAttribute("href")).toBe("/staff/settings");
  });

  it("renders nothing interactive when there is no session", async () => {
    getCurrentUserMock.mockResolvedValue(null);

    renderWithSnackbar(await MobileProfileHeaderSlotContent({ links }));

    expect(screen.queryByRole("button", { name: /^Cuenta de/ })).toBeNull();
  });

  it("renders nothing interactive when the backend is unavailable", async () => {
    getCurrentUserMock.mockRejectedValue(new SessionUnavailableError());

    renderWithSnackbar(await MobileProfileHeaderSlotContent({ links }));

    expect(screen.queryByRole("button", { name: /^Cuenta de/ })).toBeNull();
  });
});
