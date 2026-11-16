import { act } from "@testing-library/react";
import type { ReactElement } from "react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { SnackbarProvider } from "@/components/ui/snackbar";
import { CompleteProfileForm } from "@/features/auth/complete-profile-form";
import { ForgotPasswordForm } from "@/features/auth/forgot-password-form";
import { LoginForm } from "@/features/auth/login-form";
import { RegisterForm } from "@/features/auth/register-form";
import { ResetPasswordForm } from "@/features/auth/reset-password-form";
import { NewClientForm } from "@/features/clients/staff/new-client-form";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams("token=abc"),
}));

// A form sent before React loads is sent by the browser itself: as a GET to the same
// address, with every named field (the password too) written into the URL. These forms
// carry a password or personal data, so until React is in charge their send button
// must be off. A disabled default button also stops Enter from sending the form.
const FORMS: Array<[string, () => ReactElement, string]> = [
  ["login", () => <LoginForm />, "Ingresar"],
  ["register", () => <RegisterForm />, "Crear cuenta"],
  ["forgot password", () => <ForgotPasswordForm />, "Enviar enlace"],
  ["reset password", () => <ResetPasswordForm />, "Guardar nueva contraseña"],
  [
    "complete profile",
    () => <CompleteProfileForm homeHref="/dashboard" askPhone askBirthDate />,
    "Continuar",
  ],
  ["new client (staff)", () => <NewClientForm />, "Crear cliente"],
];

function submitButtonOf(container: HTMLElement): HTMLButtonElement {
  const button = container.querySelector<HTMLButtonElement>('form button[type="submit"]');
  if (!button) throw new Error("no submit button found");
  return button;
}

describe.each(FORMS)("%s form", (_name, renderForm, label) => {
  const page = () => <SnackbarProvider>{renderForm()}</SnackbarProvider>;

  it("cannot be sent while it is only server HTML", () => {
    const container = document.createElement("div");
    container.innerHTML = renderToString(page());

    const button = submitButtonOf(container);
    expect(button.textContent).toBe(label);
    expect(button.disabled).toBe(true);
  });

  it("can be sent once React has taken over", async () => {
    const container = document.createElement("div");
    container.innerHTML = renderToString(page());

    await act(async () => {
      hydrateRoot(container, page());
    });

    expect(submitButtonOf(container).disabled).toBe(false);
  });
});
