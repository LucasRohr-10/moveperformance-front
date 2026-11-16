"use client";

import { useState } from "react";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useSnackbar } from "@/components/ui/snackbar";
import type { ClientDetail } from "@/lib/api/types";

import { clientFieldErrors } from "./client-api-errors";
import { ClientPasswordField } from "./client-password-field";
import { clientPasswordSchema } from "./client-schemas";
import { setClientPassword } from "./clients-api";

const SESSIONS_CLOSE_TEXT =
  "Se cierran todas sus sesiones abiertas. Pasale la clave nueva vos: no le mandamos ningún mail.";
const CHANGED_MESSAGE = "Clave cambiada.";
const CHANGE_FAILED_MESSAGE = "No pudimos cambiar la clave. Probá de nuevo.";

export interface ChangePasswordDialogProps {
  client: ClientDetail;
  onClose(): void;
}

export function ChangePasswordDialog({ client, onClose }: ChangePasswordDialogProps) {
  const { showSnackbar } = useSnackbar();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [isSaving, setIsSaving] = useState(false);
  const fullName = `${client.name} ${client.lastName ?? ""}`.trim();

  function editPassword(value: string) {
    setPassword(value);
    setError(undefined);
  }

  async function save() {
    if (isSaving) return;
    const parsed = clientPasswordSchema.safeParse(password);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message);
      return;
    }

    setIsSaving(true);
    try {
      await setClientPassword(client.id, parsed.data);
      showSnackbar({ tone: "success", title: CHANGED_MESSAGE });
      onClose();
    } catch (failure) {
      // The dialog stays open with what staff typed, so a retry does not need a new password.
      const apiError = clientFieldErrors(failure).password;
      if (apiError) setError(apiError);
      else showSnackbar({ tone: "danger", title: CHANGE_FAILED_MESSAGE });
      setIsSaving(false);
    }
  }

  return (
    <ConfirmDialog
      title={`Cambiar la clave de ${fullName}`}
      confirmLabel="Cambiar clave"
      isBusy={isSaving}
      onConfirm={() => void save()}
      onCancel={onClose}
    >
      <p className="mt-3 text-sm leading-relaxed text-muted">{SESSIONS_CLOSE_TEXT}</p>
      <div className="mt-4">
        <ClientPasswordField value={password} onChange={editPassword} error={error} />
      </div>
    </ConfirmDialog>
  );
}
