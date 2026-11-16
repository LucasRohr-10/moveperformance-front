"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Textarea } from "@/components/ui/textarea";
import { useSnackbar } from "@/components/ui/snackbar";
import type { ClientDetail, DeactivationPreview } from "@/lib/api/types";

import { CLIENT_ERROR_CODES, clientErrorCode, clientErrorMessage } from "./client-api-errors";
import { deactivateClient, getDeactivationPreview } from "./clients-api";
import { deactivationPreviewLines } from "./deactivation-preview-lines";

export const DEACTIVATION_REASON_MAX_LENGTH = 240;

const DEACTIVATED_MESSAGE = "Cliente dado de baja.";
const DEACTIVATE_FAILED_MESSAGE = "No pudimos dar de baja al cliente. Probá de nuevo.";
const ALREADY_DEACTIVATED_FALLBACK = "El cliente ya estaba dado de baja.";
const PAYMENT_PROVIDER_MESSAGE =
  "No pudimos cancelar el débito automático en Mercado Pago y el cliente sigue activo. Probá de nuevo en unos minutos.";

type PreviewState =
  | { status: "loading" }
  | { status: "ready"; preview: DeactivationPreview }
  | { status: "error" };

export interface DeactivateClientDialogProps {
  client: ClientDetail;
  onDeactivated(client: ClientDetail): void;
  /** The record changed under staff's feet (someone else deactivated it): reload it. */
  onStale(): void;
  onClose(): void;
}

export function DeactivateClientDialog({ client, onDeactivated, onStale, onClose }: DeactivateClientDialogProps) {
  const { showSnackbar } = useSnackbar();
  const [state, setState] = useState<PreviewState>({ status: "loading" });
  // Bumped by "Reintentar" to ask the effect for the preview again.
  const [attempt, setAttempt] = useState(0);
  const [reason, setReason] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const fullName = `${client.name} ${client.lastName ?? ""}`.trim();

  useEffect(() => {
    let isCurrent = true;
    getDeactivationPreview(client.id)
      .then((preview) => {
        if (isCurrent) setState({ status: "ready", preview });
      })
      .catch((failure: unknown) => {
        if (!isCurrent) return;
        if (clientErrorCode(failure) === CLIENT_ERROR_CODES.ALREADY_DEACTIVATED) {
          reportStale(failure);
          return;
        }
        setState({ status: "error" });
      });
    return () => {
      isCurrent = false;
    };
    // `reportStale` only closes over props and the snackbar; it must not restart the request.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client.id, attempt]);

  function reportStale(failure: unknown) {
    showSnackbar({ tone: "info", title: clientErrorMessage(failure, ALREADY_DEACTIVATED_FALLBACK) });
    onStale();
    onClose();
  }

  function retryPreview() {
    setState({ status: "loading" });
    setAttempt((current) => current + 1);
  }

  async function confirm() {
    if (isSaving || state.status !== "ready") return;
    setIsSaving(true);
    try {
      const updated = await deactivateClient(client.id, reason.trim() || null);
      showSnackbar({ tone: "success", title: DEACTIVATED_MESSAGE });
      onDeactivated(updated);
    } catch (failure) {
      const code = clientErrorCode(failure);
      if (code === CLIENT_ERROR_CODES.ALREADY_DEACTIVATED) {
        reportStale(failure);
        return;
      }
      // The dialog stays open with the reason typed, so a retry does not lose it.
      if (code === CLIENT_ERROR_CODES.PAYMENT_PROVIDER_ERROR) {
        showSnackbar({ tone: "danger", title: PAYMENT_PROVIDER_MESSAGE, persistent: true });
      } else {
        showSnackbar({ tone: "danger", title: DEACTIVATE_FAILED_MESSAGE });
      }
      setIsSaving(false);
    }
  }

  return (
    <ConfirmDialog
      title={`¿Dar de baja a ${fullName}?`}
      confirmLabel="Dar de baja"
      cancelLabel="Volver"
      tone="destructive"
      isBusy={isSaving}
      // Never deactivate "blind": the button waits for the real numbers.
      isConfirmDisabled={state.status !== "ready"}
      onConfirm={() => void confirm()}
      onCancel={onClose}
    >
      {state.status === "loading" ? <p className="mt-3 text-sm text-muted">Calculando qué se cancela…</p> : null}
      {state.status === "error" ? (
        <div role="alert" className="mt-3 flex flex-wrap items-center gap-3 text-sm text-danger">
          <span>No pudimos calcular qué se cancela.</span>
          <Button type="button" variant="secondary" size="sm" touchTarget onClick={retryPreview}>
            Reintentar
          </Button>
        </div>
      ) : null}
      {state.status === "ready" ? (
        <ul className="mt-3 divide-y divide-line text-[13px]">
          {deactivationPreviewLines(state.preview).map((line) => (
            <li key={line} className="relative py-2 pl-[18px] before:absolute before:left-1 before:text-muted before:content-['•']">
              {line}
            </li>
          ))}
        </ul>
      ) : null}
      <div className="mt-4">
        <Textarea
          label="Motivo (opcional)"
          rows={2}
          maxLength={DEACTIVATION_REASON_MAX_LENGTH}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          className="resize-none"
        />
        <p className="mt-1.5 text-[11px] text-muted">Solo lo ve Staff.</p>
      </div>
    </ConfirmDialog>
  );
}
