"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { useSnackbar } from "@/components/ui/snackbar";
import { ROUTES } from "@/config/constants/routes.constants";
import { ACCOUNT_DEACTIVATED_CODE } from "@/lib/api/errors";
import { safeRedirectPath } from "@/lib/redirect-path";

import { ACCOUNT_DEACTIVATED_MESSAGE } from "./constants";
import { goToExternalUrl } from "./go-to-external-url";
import { signInWithGoogle } from "./sign-in-with-google";

// When a Google login fails, the API sends the browser back to the page that
// started it with ?error=<code>.
const RETURNED_ERRORS = {
  // The user closed or cancelled Google's screen on purpose.
  CANCELLED: "access_denied",
  // The email already has a password account that was never confirmed.
  ACCOUNT_NOT_LINKED: "account_not_linked",
  // The client was deactivated by staff.
  ACCOUNT_DEACTIVATED: ACCOUNT_DEACTIVATED_CODE,
} as const;

const ACCOUNT_NOT_LINKED_MESSAGE =
  "Ya hay una cuenta con este email que todavía no está confirmada. Ingresá con tu email y contraseña para pedir el mail de confirmación.";
const UNAVAILABLE_MESSAGE =
  "No pudimos ingresar con Google. Probá de nuevo en unos minutos.";

function toReturnedErrorMessage(code: string | null): string | null {
  if (!code || code === RETURNED_ERRORS.CANCELLED) return null;
  if (code === RETURNED_ERRORS.ACCOUNT_NOT_LINKED) {
    return ACCOUNT_NOT_LINKED_MESSAGE;
  }
  if (code === RETURNED_ERRORS.ACCOUNT_DEACTIVATED) return ACCOUNT_DEACTIVATED_MESSAGE;
  return UNAVAILABLE_MESSAGE;
}

export function GoogleSignInButton() {
  const searchParams = useSearchParams();
  const returnedError = searchParams.get("error");
  // Where the visitor was headed before being asked to sign in; re-validated
  // like LoginForm does since the query string is attacker-visible.
  const redirectTo = safeRedirectPath(searchParams.get("redirectTo"));
  const [isRedirecting, setIsRedirecting] = useState(false);
  const { showSnackbar } = useSnackbar();

  // Shown once when Google sends the browser back with ?error=<code>.
  useEffect(() => {
    const message = toReturnedErrorMessage(returnedError);
    if (message) showSnackbar({ tone: "danger", title: message });
  }, [returnedError, showSnackbar]);

  // Coming back from Google with the browser's Back button restores this page
  // from the back/forward cache exactly as it was, button still disabled.
  useEffect(() => {
    function handlePageShow(event: PageTransitionEvent) {
      if (event.persisted) setIsRedirecting(false);
    }
    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, []);

  async function handleClick() {
    setIsRedirecting(true);
    // On failure only redirectTo travels back, so an earlier ?error= is not repeated.
    const errorCallbackURL = new URL(window.location.pathname, window.location.origin);
    if (redirectTo) errorCallbackURL.searchParams.set("redirectTo", redirectTo);

    const result = await signInWithGoogle({
      callbackURL: new URL(redirectTo ?? ROUTES.DASHBOARD, window.location.origin).toString(),
      errorCallbackURL: errorCallbackURL.toString(),
    });

    if (!result.ok) {
      showSnackbar({ tone: "danger", title: UNAVAILABLE_MESSAGE });
      setIsRedirecting(false);
      return;
    }

    // Stays "redirecting" while the browser leaves for Google.
    goToExternalUrl(result.url);
  }

  return (
    <div className="space-y-6">
      <div
        aria-hidden="true"
        className="flex items-center gap-4 text-[10px] uppercase tracking-[0.25em] text-muted"
      >
        <span className="h-px flex-1 bg-line" />o continuá con
        <span className="h-px flex-1 bg-line" />
      </div>
      <button
        type="button"
        disabled={isRedirecting}
        onClick={handleClick}
        className="flex w-full items-center justify-center gap-3 rounded border border-line bg-soft py-2.5 text-sm font-medium transition-colors hover:bg-card disabled:cursor-not-allowed disabled:opacity-50"
      >
        <GoogleLogo />
        {isRedirecting ? "Redirigiendo a Google…" : "Continuar con Google"}
      </button>
    </div>
  );
}

function GoogleLogo() {
  return (
    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15A11 11 0 0 0 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  );
}
