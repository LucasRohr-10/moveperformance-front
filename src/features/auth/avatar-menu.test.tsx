import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Activity } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithSnackbar } from "@/test/render-with-snackbar";

import type { AuthenticatedUser } from "@/lib/session";

import { AvatarMenu } from "./avatar-menu";
import { SIGN_OUT_ERRORS, signOut } from "./sign-out";

const replace = vi.hoisted(() => vi.fn());
const refresh = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, refresh }),
}));

vi.mock("./sign-out", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./sign-out")>()),
  signOut: vi.fn(),
}));

const signOutMock = vi.mocked(signOut);

const user: AuthenticatedUser = {
  id: "1",
  name: "Ana",
  lastName: "Perez",
  email: "ana@move.uy",
  phone: "+59899123456",
  birthDate: "1990-03-12",
  role: "client",
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("AvatarMenu", () => {
  it("signs out, goes to the public home, and refreshes the router cache", async () => {
    signOutMock.mockResolvedValue({ ok: true });
    renderWithSnackbar(<AvatarMenu user={user} />);
    const interactiveUser = userEvent.setup();

    await interactiveUser.click(
      screen.getByRole("button", { name: "Cuenta de Ana" }),
    );
    await interactiveUser.click(
      screen.getByRole("menuitem", { name: "Cerrar sesión" }),
    );

    expect(signOutMock).toHaveBeenCalled();
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/"));
    expect(refresh).toHaveBeenCalled();
  });

  it("shows a retry message and stays on the authenticated screen when sign-out fails", async () => {
    signOutMock.mockResolvedValue({
      ok: false,
      error: SIGN_OUT_ERRORS.UNAVAILABLE,
    });
    renderWithSnackbar(<AvatarMenu user={user} />);
    const interactiveUser = userEvent.setup();

    await interactiveUser.click(
      screen.getByRole("button", { name: "Cuenta de Ana" }),
    );
    await interactiveUser.click(
      screen.getByRole("menuitem", { name: "Cerrar sesión" }),
    );

    expect((await screen.findByRole("alert")).textContent).toContain(
      "No pudimos cerrar tu sesión. Probá de nuevo.",
    );
    expect(replace).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
    expect(
      screen.getByRole<HTMLButtonElement>("menuitem", { name: "Cerrar sesión" })
        .disabled,
    ).toBe(false);
  });

  it("opens upward when there isn't enough room below the button", async () => {
    renderWithSnackbar(<AvatarMenu user={user} />);
    const interactiveUser = userEvent.setup();
    const button = screen.getByRole("button", { name: "Cuenta de Ana" });
    vi.spyOn(button, "getBoundingClientRect").mockReturnValue({
      bottom: 750,
      top: 718,
      left: 0,
      right: 32,
      width: 32,
      height: 32,
      x: 0,
      y: 718,
      toJSON: () => ({}),
    });
    vi.spyOn(window, "innerHeight", "get").mockReturnValue(760);

    await interactiveUser.click(button);

    const panel = screen.getByRole("menu");
    expect(panel.className).toContain("bottom-10");
    expect(panel.className).not.toContain("top-10");
  });

  it("opens downward when there's enough room below the button", async () => {
    renderWithSnackbar(<AvatarMenu user={user} />);
    const interactiveUser = userEvent.setup();
    const button = screen.getByRole("button", { name: "Cuenta de Ana" });
    vi.spyOn(button, "getBoundingClientRect").mockReturnValue({
      bottom: 64,
      top: 32,
      left: 0,
      right: 32,
      width: 32,
      height: 32,
      x: 0,
      y: 32,
      toJSON: () => ({}),
    });
    vi.spyOn(window, "innerHeight", "get").mockReturnValue(800);

    await interactiveUser.click(button);

    const panel = screen.getByRole("menu");
    expect(panel.className).toContain("top-10");
    expect(panel.className).not.toContain("bottom-10");
  });

  it("aligns to the left of the button when there isn't enough room to its left (e.g. a narrow sidebar)", async () => {
    renderWithSnackbar(<AvatarMenu user={user} />);
    const interactiveUser = userEvent.setup();
    const button = screen.getByRole("button", { name: "Cuenta de Ana" });
    vi.spyOn(button, "getBoundingClientRect").mockReturnValue({
      bottom: 64,
      top: 32,
      left: 16,
      right: 48,
      width: 32,
      height: 32,
      x: 16,
      y: 32,
      toJSON: () => ({}),
    });
    vi.spyOn(window, "innerHeight", "get").mockReturnValue(800);

    await interactiveUser.click(button);

    const panel = screen.getByRole("menu");
    expect(panel.className).toContain("left-0");
    expect(panel.className).not.toContain("right-0");
  });

  it("aligns to the right of the button when there's enough room to its left", async () => {
    renderWithSnackbar(<AvatarMenu user={user} />);
    const interactiveUser = userEvent.setup();
    const button = screen.getByRole("button", { name: "Cuenta de Ana" });
    vi.spyOn(button, "getBoundingClientRect").mockReturnValue({
      bottom: 64,
      top: 32,
      left: 880,
      right: 912,
      width: 32,
      height: 32,
      x: 880,
      y: 32,
      toJSON: () => ({}),
    });
    vi.spyOn(window, "innerHeight", "get").mockReturnValue(800);

    await interactiveUser.click(button);

    const panel = screen.getByRole("menu");
    expect(panel.className).toContain("right-0");
    expect(panel.className).not.toContain("left-0");
  });

  it("renders the extra links above the sign-out button and closes the menu when one is clicked", async () => {
    renderWithSnackbar(
      <AvatarMenu
        user={user}
        links={[{ label: "Mi perfil", href: "/dashboard" }]}
      />,
    );
    const interactiveUser = userEvent.setup();

    await interactiveUser.click(
      screen.getByRole("button", { name: "Cuenta de Ana" }),
    );
    const profileLink = screen.getByRole("menuitem", { name: "Mi perfil" });
    expect(profileLink.getAttribute("href")).toBe("/dashboard");

    await interactiveUser.click(profileLink);

    expect(
      screen.queryByRole("menuitem", { name: "Cerrar sesión" }),
    ).toBeNull();
  });

  it("closes itself when hidden (cacheComponents keeps the route alive on navigation, it does not unmount it)", async () => {
    const { rerender } = renderWithSnackbar(
      <Activity mode="visible">
        <AvatarMenu user={user} />
      </Activity>,
    );
    const interactiveUser = userEvent.setup();

    await interactiveUser.click(
      screen.getByRole("button", { name: "Cuenta de Ana" }),
    );
    expect(
      screen.getByRole("menuitem", { name: "Cerrar sesión" }),
    ).toBeDefined();

    rerender(
      <Activity mode="hidden">
        <AvatarMenu user={user} />
      </Activity>,
    );
    rerender(
      <Activity mode="visible">
        <AvatarMenu user={user} />
      </Activity>,
    );

    expect(
      screen.queryByRole("menuitem", { name: "Cerrar sesión" }),
    ).toBeNull();
  });
});
