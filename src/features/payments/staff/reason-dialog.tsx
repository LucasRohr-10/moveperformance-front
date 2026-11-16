"use client";

import { useRef, useState } from "react";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Textarea } from "@/components/ui/textarea";

export const REASON_MAX_LENGTH = 240;

const REASON_REQUIRED_ERROR = "Escribí el motivo.";
const REASON_TOO_LONG_ERROR = "Máximo 240 caracteres.";

export interface ReasonDialogProps {
  title: string;
  description: string;
  placeholder?: string;
  confirmLabel: string;
  tone: "primary" | "destructive";
  /** Rejecting keeps the dialog open: the caller already told staff what went wrong. Resolving closes it. */
  onSubmit(reason: string): Promise<void>;
  onClose(): void;
}

function reasonError(reason: string): string | undefined {
  if (reason === "") return REASON_REQUIRED_ERROR;
  if (reason.length > REASON_MAX_LENGTH) return REASON_TOO_LONG_ERROR;
  return undefined;
}

export function ReasonDialog({
  title,
  description,
  placeholder,
  confirmLabel,
  tone,
  onSubmit,
  onClose,
}: ReasonDialogProps) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [isBusy, setIsBusy] = useState(false);
  const submitting = useRef(false);

  async function confirm() {
    if (submitting.current) return;
    const trimmed = reason.trim();
    const invalid = reasonError(trimmed);
    if (invalid) {
      setError(invalid);
      return;
    }
    submitting.current = true;
    setIsBusy(true);
    try {
      await onSubmit(trimmed);
    } catch {
      submitting.current = false;
      setIsBusy(false);
      return;
    }
    onClose();
  }

  return (
    <ConfirmDialog
      title={title}
      description={description}
      confirmLabel={confirmLabel}
      tone={tone}
      isBusy={isBusy}
      onConfirm={() => void confirm()}
      onCancel={onClose}
    >
      <div className="mt-5">
        <Textarea
          label="Motivo"
          name="reason"
          rows={3}
          placeholder={placeholder}
          value={reason}
          onChange={(event) => {
            setReason(event.target.value);
            setError(undefined);
          }}
          error={error}
        />
      </div>
    </ConfirmDialog>
  );
}
