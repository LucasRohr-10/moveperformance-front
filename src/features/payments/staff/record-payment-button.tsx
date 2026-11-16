"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import type { OfflineChargeDetailDto, OfflineChargeDto } from "@/lib/api/types";

import { offlineChargeWhat, offlineChargeWhen } from "./offline-charge-labels";
import { RecordPaymentDialog } from "./record-payment-dialog";

export interface RecordPaymentButtonProps {
  charge: OfflineChargeDto;
  /** Runs after a payment is recorded (with the charge as the backend left it), or with nothing when the charge turned out to be no longer open. */
  onChanged(detail?: OfflineChargeDetailDto): void;
}

// A client's plan and each turn of it have the same button: the name says whose charge it is and what it pays.
const buttonLabel = (charge: OfflineChargeDto): string =>
  [`Marcar como pagado: ${charge.client?.name ?? "Cliente"}`, offlineChargeWhat(charge), offlineChargeWhen(charge)]
    .filter(Boolean)
    .join(", ");

// Only the open dialog is mounted, so every opening starts from the charge's own values.
export function RecordPaymentButton({ charge, onChanged }: RecordPaymentButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const close = () => setIsOpen(false);

  return (
    <>
      <Button type="button" size="sm" touchTarget aria-label={buttonLabel(charge)} onClick={() => setIsOpen(true)}>
        Marcar como pagado
      </Button>
      {isOpen ? (
        <RecordPaymentDialog
          charge={charge}
          onRecorded={(detail) => {
            close();
            onChanged(detail);
          }}
          onStale={() => onChanged()}
          onClose={close}
        />
      ) : null}
    </>
  );
}
