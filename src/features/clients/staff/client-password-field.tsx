"use client";

import { useId } from "react";

import { Button } from "@/components/ui/button";
import { controlClass, describedBy, Field } from "@/components/ui/field";
import { useSnackbar } from "@/components/ui/snackbar";
import { PasswordStrengthMeter } from "@/features/auth/password-strength-meter";

import { generatePassword } from "./generate-password";

const PASSWORD_COPIED_MESSAGE = "Clave copiada.";
const PASSWORD_COPY_FAILED_MESSAGE = "No pudimos copiar la clave. Copiala a mano.";

export interface ClientPasswordFieldProps {
  id?: string;
  value: string;
  onChange(value: string): void;
  error?: string;
}

// The password is shown in clear on purpose: staff copies it and hands it to the client.
// It lives only in the parent's state: never logged, never in a URL, never in storage.
export function ClientPasswordField({ id, value, onChange, error }: ClientPasswordFieldProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const { showSnackbar } = useSnackbar();

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      showSnackbar({ tone: "success", title: PASSWORD_COPIED_MESSAGE });
    } catch {
      // Also reached when the browser has no clipboard API (navigator.clipboard is undefined).
      showSnackbar({ tone: "warning", title: PASSWORD_COPY_FAILED_MESSAGE });
    }
  }

  return (
    <Field id={fieldId} label="Clave" error={error}>
      <div className="mt-2 flex items-stretch gap-2">
        <input
          id={fieldId}
          type="text"
          autoComplete="off"
          spellCheck={false}
          autoCapitalize="none"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy(fieldId, error)}
          className={controlClass(error, "mt-0 min-w-0 flex-1 font-mono tracking-wide")}
        />
        <Button type="button" variant="secondary" size="sm" touchTarget onClick={() => onChange(generatePassword())}>
          Generar
        </Button>
        <Button type="button" variant="secondary" size="sm" touchTarget disabled={!value} onClick={handleCopy}>
          Copiar
        </Button>
      </div>
      <PasswordStrengthMeter password={value} tone="success" />
    </Field>
  );
}
