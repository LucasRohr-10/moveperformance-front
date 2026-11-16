import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { renderWithSnackbar } from "@/test/render-with-snackbar";

import { AuthenticatedShell } from "./layout";

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
  useRouter: () => ({ push: vi.fn() }),
}));
// Async server components that read the session: they never settle in a client-side render and hold back the bell's effects.
vi.mock("@/features/profile", () => ({ MobileProfileHeaderSlot: () => null }));
vi.mock("@/features/auth", () => ({ AvatarSlot: () => null }));
vi.mock("@/features/birthday-celebration", () => ({ BirthdaySlot: () => <div data-testid="birthday-slot" /> }));
vi.mock("@/features/inbox/inbox-api", () => ({
  getUnreadCount: vi.fn().mockResolvedValue(3),
  listInbox: vi.fn(),
  markInboxItemRead: vi.fn(),
}));

describe("AuthenticatedShell", () => {
  it("wires every nav link to a real route, none left as a dead anchor", () => {
    renderWithSnackbar(
      <AuthenticatedShell>
        <p>content</p>
      </AuthenticatedShell>,
    );

    const expected: Record<string, string> = {
      "Mi perfil": "/dashboard",
      Reservar: "/bookings",
      Planes: "/plans",
      Actividad: "/history",
    };

    Object.entries(expected).forEach(([label, href]) => {
      const links = screen
        .getAllByRole("link", { name: label })
        .map((link) => link.getAttribute("href"));
      expect(links).toContain(href);
    });
  });

  it("renders the bell with a Spanish label and the unread count", async () => {
    renderWithSnackbar(
      <AuthenticatedShell>
        <p>content</p>
      </AuthenticatedShell>,
    );

    expect(await screen.findByRole("button", { name: "Notificaciones, 3 sin leer" })).toBeDefined();
    expect(screen.queryByRole("button", { name: "Notifications" })).toBeNull();
  });

  it("mounts the birthday celebration in every client page", () => {
    renderWithSnackbar(
      <AuthenticatedShell>
        <p>content</p>
      </AuthenticatedShell>,
    );

    expect(screen.getByTestId("birthday-slot")).toBeDefined();
  });
});
