import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Activity, createRef } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithSnackbar } from "@/test/render-with-snackbar";

import type { AuthenticatedUser } from "@/lib/session";

import { AccountControl } from "./account-control";

const replace = vi.hoisted(() => vi.fn());
const refresh = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, refresh }),
}));

vi.mock("@/features/auth/sign-out", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/features/auth/sign-out")>()),
  signOut: vi.fn(),
}));

import { signOut } from "@/features/auth/sign-out";

const signOutMock = vi.mocked(signOut);

const user: AuthenticatedUser = {
  id: "1",
  name: "Ana Perez",
  lastName: "Perez",
  email: "ana@move.uy",
  phone: "+59899123456",
  birthDate: "1990-03-12",
  role: "client",
};

function setup(isOpen: boolean) {
  const onToggle = vi.fn();
  const triggerRef = createRef<HTMLButtonElement>();
  renderWithSnackbar(<AccountControl user={user} isOpen={isOpen} onToggle={onToggle} triggerRef={triggerRef} />);
  return { onToggle, triggerRef };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("AccountControl", () => {
  it("renders a labeled trigger with the user's initials", () => {
    setup(false);

    const trigger = screen.getByRole("button", { name: "Cuenta de Ana Perez" });
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(screen.getByRole("img", { name: "AP" })).toBeDefined();
  });

  it("shows the real name, email, and a pending plan state when open, with no Ajustes item until a settingsHref is given", () => {
    setup(true);

    const panel = screen.getByRole("menu", { name: "Cuenta de Ana Perez" });
    expect(panel.textContent).toContain("Ana Perez");
    expect(panel.textContent).toContain("ana@move.uy");
    expect(panel.textContent).toContain("Próximamente");
    expect(screen.queryByText("Ajustes")).toBeNull();
  });

  it("signs out, goes to the public home, and refreshes the router cache", async () => {
    signOutMock.mockResolvedValue({ ok: true });
    setup(true);
    const interactiveUser = userEvent.setup();

    await interactiveUser.click(screen.getByRole("menuitem", { name: "Cerrar sesión" }));

    expect(signOutMock).toHaveBeenCalled();
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/"));
    expect(refresh).toHaveBeenCalled();
  });

  it("clears a stuck signing-out state when hidden (cacheComponents keeps the route alive on navigation, it does not unmount it)", async () => {
    let resolveSignOut: (value: { ok: true }) => void = () => {};
    signOutMock.mockReturnValue(new Promise((resolve) => (resolveSignOut = resolve)));
    const triggerRef = createRef<HTMLButtonElement>();
    const { rerender } = renderWithSnackbar(
      <Activity mode="visible">
        <AccountControl user={user} isOpen onToggle={vi.fn()} triggerRef={triggerRef} />
      </Activity>,
    );
    const interactiveUser = userEvent.setup();

    await interactiveUser.click(screen.getByRole("menuitem", { name: "Cerrar sesión" }));
    expect(screen.getByRole("menuitem", { name: "Cerrando sesión…" })).toBeDefined();

    rerender(
      <Activity mode="hidden">
        <AccountControl user={user} isOpen onToggle={vi.fn()} triggerRef={triggerRef} />
      </Activity>,
    );
    rerender(
      <Activity mode="visible">
        <AccountControl user={user} isOpen onToggle={vi.fn()} triggerRef={triggerRef} />
      </Activity>,
    );

    expect(screen.getByRole("menuitem", { name: "Cerrar sesión" })).toBeDefined();
    resolveSignOut({ ok: true });
  });

  it("hides the plan box when showPlan is false", () => {
    const triggerRef = createRef<HTMLButtonElement>();
    renderWithSnackbar(
      <AccountControl
        user={user}
        isOpen
        onToggle={vi.fn()}
        triggerRef={triggerRef}
        showPlan={false}
      />,
    );

    expect(screen.queryByText("Plan")).toBeNull();
  });

  it("renders Ajustes as a real link when settingsHref is provided", () => {
    const triggerRef = createRef<HTMLButtonElement>();
    renderWithSnackbar(
      <AccountControl
        user={user}
        isOpen
        onToggle={vi.fn()}
        triggerRef={triggerRef}
        settingsHref="/staff/settings"
      />,
    );

    const ajustes = screen.getByRole("menuitem", { name: "Ajustes" });
    expect(ajustes.tagName).toBe("A");
    expect(ajustes.getAttribute("href")).toBe("/staff/settings");
  });
});
