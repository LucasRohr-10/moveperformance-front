"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { useErrorSnackbar } from "@/components/ui/snackbar";
// By path: the subscriptions index also exports server-only code (next/headers).
import { formatBusinessDate } from "@/features/subscriptions/present-subscriptions";
import type { AutoDebitDto } from "@/lib/api/types";

import { presentAutoDebitLine } from "./present-auto-debit";
import { useMyAutoDebits } from "./use-my-auto-debits";

type CancelState =
  | { phase: "idle" }
  | { phase: "confirming" }
  | { phase: "cancelling" }
  | { phase: "failed"; message: string }
  | { phase: "cancelled" };

function validityText(paidUntil: string | null): string {
  if (paidUntil === null) return "Lo que ya pagaste sigue vigente.";
  return `Lo que ya pagaste sigue vigente hasta el ${formatBusinessDate(paidUntil)}.`;
}

function CancelConfirmation({
  paidUntil,
  state,
  onBack,
  onConfirm,
}: {
  paidUntil: string | null;
  state: CancelState;
  onBack: () => void;
  onConfirm: () => void;
}) {
  const groupRef = useRef<HTMLDivElement>(null);
  const isCancelling = state.phase === "cancelling";

  // The confirmation opens where the "Cancelar débito" button was, so focus moves into it (on "Volver", the safe choice).
  useEffect(() => {
    groupRef.current?.querySelector("button")?.focus();
  }, []);

  return (
    <div ref={groupRef} role="group" aria-label="Cancelar débito automático" className="mt-3 rounded border border-line p-4">
      <p className="text-sm font-medium">¿Cancelar el débito automático?</p>
      <p className="mt-1 text-xs text-muted">{validityText(paidUntil)}</p>
      <div className="mt-4 flex flex-wrap gap-3">
        <Button type="button" variant="secondary" disabled={isCancelling} onClick={onBack} touchTarget>
          Volver
        </Button>
        <Button type="button" disabled={isCancelling} onClick={onConfirm} touchTarget>
          {isCancelling ? "Cancelando…" : "Sí, cancelar débito"}
        </Button>
      </div>
    </div>
  );
}

/**
 * The automatic debit of one service inside its card in "Mi plan", with its inline cancellation.
 * It reads the debits itself: this is a client component, so the server section does not wait for it.
 */
export function AutoDebitLine({
  service,
  paidUntil,
}: {
  service: AutoDebitDto["service"];
  // The business date (YYYY-MM-DD) up to which what the client already paid is valid.
  paidUntil: string | null;
}) {
  const { state, reload, cancel } = useMyAutoDebits();
  const [cancelState, setCancelState] = useState<CancelState>({ phase: "idle" });
  useErrorSnackbar(cancelState.phase === "failed" ? cancelState.message : null);
  // A ref, not state: two clicks in the same tick both see the same render's state.
  const isCancellingRef = useRef(false);

  if (state === "loading") return null;
  if (state === "error") {
    return (
      <div className="mt-4">
        <p role="alert" className="text-sm text-danger">
          No pudimos cargar tu débito automático.
        </p>
        <Button type="button" variant="secondary" size="sm" onClick={reload} touchTarget className="mt-2">
          Reintentar
        </Button>
      </div>
    );
  }

  if (cancelState.phase === "cancelled") {
    return (
      <p role="status" className="mt-4 text-sm text-muted">
        Débito automático cancelado.
      </p>
    );
  }

  const line = presentAutoDebitLine(state.debits, service);
  if (line === null) return null;

  async function confirmCancel(debitId: string): Promise<void> {
    if (isCancellingRef.current) return;
    isCancellingRef.current = true;
    setCancelState({ phase: "cancelling" });

    const result = await cancel(debitId);
    isCancellingRef.current = false;
    setCancelState(result.ok ? { phase: "cancelled" } : { phase: "failed", message: result.message });
  }

  const isConfirming = cancelState.phase !== "idle";
  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">{line.text}</p>
        {line.canCancel && !isConfirming ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setCancelState({ phase: "confirming" })}
            touchTarget
          >
            Cancelar débito
          </Button>
        ) : null}
      </div>
      {isConfirming ? (
        <CancelConfirmation
          paidUntil={paidUntil}
          state={cancelState}
          onBack={() => setCancelState({ phase: "idle" })}
          onConfirm={() => void confirmCancel(line.debitId)}
        />
      ) : null}
    </div>
  );
}
