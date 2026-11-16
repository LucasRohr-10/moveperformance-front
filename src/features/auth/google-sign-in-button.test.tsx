import { act, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithSnackbar } from "@/test/render-with-snackbar";

import { goToExternalUrl } from "./go-to-external-url";
import { GoogleSignInButton } from "./google-sign-in-button";
import {
  GOOGLE_SIGN_IN_ERRORS,
  type GoogleSignInResult,
  signInWithGoogle,
} from "./sign-in-with-google";

const searchParams = vi.hoisted(() => ({ current: new URLSearchParams() }));

vi.mock("next/navigation", () => ({
  useSearchParams: () => searchParams.current,
}));

vi.mock("./sign-in-with-google", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./sign-in-with-google")>()),
  signInWithGoogle: vi.fn(),
}));

vi.mock("./go-to-external-url", () => ({ goToExternalUrl: vi.fn() }));

const signIn = vi.mocked(signInWithGoogle);
const goTo = vi.mocked(goToExternalUrl);

const GOOGLE_URL = "https://accounts.google.com/o/oauth2/v2/auth?client_id=abc";
const UNAVAILABLE_MESSAGE =
  "No pudimos ingresar con Google. Probá de nuevo en unos minutos.";

async function clickGoogle() {
  const user = userEvent.setup();
  await user.click(
    screen.getByRole("button", { name: "Continuar con Google" }),
  );
  return user;
}

beforeEach(() => {
  vi.clearAllMocks();
  searchParams.current = new URLSearchParams();
});

describe("GoogleSignInButton", () => {
  it("sends the browser to Google, coming back to the dashboard or to this page on error", async () => {
    signIn.mockResolvedValue({ ok: true, url: GOOGLE_URL });
    renderWithSnackbar(<GoogleSignInButton />);

    await clickGoogle();

    expect(signIn).toHaveBeenCalledWith({
      callbackURL: `${window.location.origin}/dashboard`,
      errorCallbackURL: `${window.location.origin}${window.location.pathname}`,
    });
    await waitFor(() => expect(goTo).toHaveBeenCalledWith(GOOGLE_URL));
    expect(
      screen.getByRole<HTMLButtonElement>("button", {
        name: "Redirigiendo a Google…",
      }).disabled,
    ).toBe(true);
  });

  it("comes back to the page the visitor was trying to reach, and keeps it if Google login fails", async () => {
    searchParams.current = new URLSearchParams({ redirectTo: "/history?tab=pagos" });
    signIn.mockResolvedValue({ ok: true, url: GOOGLE_URL });
    renderWithSnackbar(<GoogleSignInButton />);

    await clickGoogle();

    expect(signIn).toHaveBeenCalledWith({
      callbackURL: `${window.location.origin}/history?tab=pagos`,
      errorCallbackURL: `${window.location.origin}${window.location.pathname}?redirectTo=${encodeURIComponent("/history?tab=pagos")}`,
    });
  });

  it("does not repeat an earlier ?error= in the URL it comes back to after a failure", async () => {
    searchParams.current = new URLSearchParams({
      redirectTo: "/plans",
      error: "account_not_linked",
    });
    signIn.mockResolvedValue({ ok: true, url: GOOGLE_URL });
    renderWithSnackbar(<GoogleSignInButton />);

    await clickGoogle();

    expect(signIn).toHaveBeenCalledWith({
      callbackURL: `${window.location.origin}/plans`,
      errorCallbackURL: `${window.location.origin}${window.location.pathname}?redirectTo=${encodeURIComponent("/plans")}`,
    });
  });

  it("ignores an unsafe redirectTo and goes to the dashboard", async () => {
    searchParams.current = new URLSearchParams({ redirectTo: "//evil.com" });
    signIn.mockResolvedValue({ ok: true, url: GOOGLE_URL });
    renderWithSnackbar(<GoogleSignInButton />);

    await clickGoogle();

    expect(signIn).toHaveBeenCalledWith({
      callbackURL: `${window.location.origin}/dashboard`,
      errorCallbackURL: `${window.location.origin}${window.location.pathname}`,
    });
  });

  it("shows the deactivated message when Google sends back ?error=ACCOUNT_DEACTIVATED", async () => {
    searchParams.current = new URLSearchParams({ error: "ACCOUNT_DEACTIVATED" });

    renderWithSnackbar(<GoogleSignInButton />);

    expect((await screen.findByRole("alert")).textContent).toContain(
      "Tu cuenta está desactivada. Escribile a MOVE para reactivarla.",
    );
  });

  it("shows a generic message and lets the user retry when the API is unavailable", async () => {
    signIn.mockResolvedValue({
      ok: false,
      error: GOOGLE_SIGN_IN_ERRORS.UNAVAILABLE,
    });
    renderWithSnackbar(<GoogleSignInButton />);

    await clickGoogle();

    expect((await screen.findByRole("alert")).textContent).toContain(
      UNAVAILABLE_MESSAGE,
    );
    expect(goTo).not.toHaveBeenCalled();
    expect(
      screen.getByRole<HTMLButtonElement>("button", {
        name: "Continuar con Google",
      }).disabled,
    ).toBe(false);
  });

  it("sends a single request when the user clicks twice", async () => {
    let resolveSignIn: (result: GoogleSignInResult) => void = () => {};
    signIn.mockReturnValue(
      new Promise((resolve) => {
        resolveSignIn = resolve;
      }),
    );
    renderWithSnackbar(<GoogleSignInButton />);

    const user = await clickGoogle();
    await user.click(
      screen.getByRole("button", { name: "Redirigiendo a Google…" }),
    );

    expect(signIn).toHaveBeenCalledTimes(1);
    resolveSignIn({ ok: true, url: GOOGLE_URL });
    await waitFor(() => expect(goTo).toHaveBeenCalledTimes(1));
  });

  it("re-enables the button when the user comes back from Google with Back", async () => {
    signIn.mockResolvedValue({ ok: true, url: GOOGLE_URL });
    renderWithSnackbar(<GoogleSignInButton />);
    await clickGoogle();
    await waitFor(() => expect(goTo).toHaveBeenCalled());

    const restoredFromCache = new Event("pageshow");
    Object.defineProperty(restoredFromCache, "persisted", { value: true });
    act(() => {
      window.dispatchEvent(restoredFromCache);
    });

    expect(
      screen.getByRole<HTMLButtonElement>("button", {
        name: "Continuar con Google",
      }).disabled,
    ).toBe(false);
  });

  it("explains an unconfirmed password account with the same email", () => {
    searchParams.current = new URLSearchParams("error=account_not_linked");
    renderWithSnackbar(<GoogleSignInButton />);

    expect(screen.getByRole("alert").textContent).toContain(
      "Ya hay una cuenta con este email que todavía no está confirmada. Ingresá con tu email y contraseña para pedir el mail de confirmación.",
    );
  });

  it("says nothing when the user cancelled on Google's screen", () => {
    searchParams.current = new URLSearchParams("error=access_denied");
    renderWithSnackbar(<GoogleSignInButton />);

    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("shows the generic message for any other error Google login came back with", () => {
    searchParams.current = new URLSearchParams("error=invalid_code");
    renderWithSnackbar(<GoogleSignInButton />);

    expect(screen.getByRole("alert").textContent).toContain(UNAVAILABLE_MESSAGE);
  });
});
