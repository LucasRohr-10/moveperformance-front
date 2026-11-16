"use client";

import { useState } from "react";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useSnackbar } from "@/components/ui/snackbar";
import type { ClientDetail } from "@/lib/api/types";

import { CLIENT_ERROR_CODES, clientErrorCode, clientErrorMessage } from "./client-api-errors";
import { reactivateClient } from "./clients-api";

const EXPLANATION =
  "Va a poder entrar con su clave de siempre. Si su plan sigue en fecha lo puede usar enseguida, pero los días de baja no se devuelven. Las reservas canceladas y el débito automático no vuelven.";
const REACTIVATED_MESSAGE = "Cliente reactivado.";
const REACTIVATE_FAILED_MESSAGE = "No pudimos reactivar al cliente. Probá de nuevo.";
const NOT_DEACTIVATED_FALLBACK = "El cliente ya estaba activo.";

export interface ReactivateClientDialogProps {
  client: ClientDetail;
  onReactivated(client: ClientDetail): void;
  /** The record changed under staff's feet (someone else reactivated it): reload it. */
  onStale(): void;
  onClose(): void;
}

export function ReactivateClientDialog({ client, onReactivated, onStale, onClose }: ReactivateClientDialogProps) {
  const { showSnackbar } = useSnackbar();
  const [isSaving, setIsSaving] = useState(false);
  const fullName = `${client.name} ${client.lastName ?? ""}`.trim();

  async function confirm() {
    if (isSaving) return;
    setIsSaving(true);
    try {
      const updated = await reactivateClient(client.id);
      showSnackbar({ tone: "success", title: REACTIVATED_MESSAGE });
      onReactivated(updated);
    } catch (failure) {
      if (clientErrorCode(failure) === CLIENT_ERROR_CODES.NOT_DEACTIVATED) {
        showSnackbar({ tone: "info", title: clientErrorMessage(failure, NOT_DEACTIVATED_FALLBACK) });
        onStale();
        onClose();
        return;
      }
      showSnackbar({ tone: "danger", title: REACTIVATE_FAILED_MESSAGE });
      setIsSaving(false);
    }
  }

  return (
    <ConfirmDialog
      title={`¿Reactivar a ${fullName}?`}
      description={EXPLANATION}
      confirmLabel="Reactivar"
      isBusy={isSaving}
      onConfirm={() => void confirm()}
      onCancel={onClose}
    />
  );
}
