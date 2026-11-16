"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useErrorSnackbar } from "@/components/ui/snackbar";
import { ApiError } from "@/lib/api/errors";
import type { AutoDebitDto, SimulatedDebitAction } from "@/lib/api/types";
// By path: the checkout index also exports server-only code (next/headers).
import { autoDebitResultHref } from "@/features/checkout/checkout-routes";

import { simulateAutoDebit } from "./auto-debits-api";
import { presentAutoDebitLine } from "./present-auto-debit";

type SimulationState =
  | { phase: "idle" }
  | { phase: "running" }
  | { phase: "charged"; debit: AutoDebitDto }
  | { phase: "off" }
  | { phase: "not-found" }
  | { phase: "failed"; message: string };

const NETWORK_ERROR_MESSAGE = "No pudimos simular el débito. Probá de nuevo.";
const CANCELLED_MESSAGE = "Débito automático cancelado.";

const STATES_BY_ERROR_CODE: Partial<Record<string, SimulationState>> = {
  NOT_FOUND: { phase: "off" },
  AUTO_DEBIT_NOT_FOUND: { phase: "not-found" },
  VALIDATION_FAILED: { phase: "not-found" },
};

// Authorizing and cancelling change what the result page shows, so they go there. A charge only moves the next date.
const GOES_TO_RESULT: Record<SimulatedDebitAction, boolean> = {
  authorize: true,
  cancel: true,
  charge_approved: false,
  charge_rejected: false,
};

const ACTION_BUTTONS: { action: SimulatedDebitAction; label: string; variant: "primary" | "secondary" }[] = [
  { action: "authorize", label: "Autorizar", variant: "primary" },
  { action: "charge_approved", label: "Cobrar ciclo (aprobado)", variant: "secondary" },
  { action: "charge_rejected", label: "Cobrar ciclo (rechazado)", variant: "secondary" },
  { action: "cancel", label: "Cancelar", variant: "secondary" },
];

function failureState(error: unknown): SimulationState {
  if (!(error instanceof ApiError)) return { phase: "failed", message: NETWORK_ERROR_MESSAGE };
  return STATES_BY_ERROR_CODE[error.body.code] ?? { phase: "failed", message: error.body.message };
}

function MessageCard({ title, body }: { title: string; body: string }) {
  return (
    <Card>
      <h2 className="font-display text-2xl font-extrabold uppercase">{title}</h2>
      <p className="mt-3 text-sm text-muted">{body}</p>
    </Card>
  );
}

function chargedText(debit: AutoDebitDto): string {
  return presentAutoDebitLine([debit], debit.service)?.text ?? CANCELLED_MESSAGE;
}

function DebitSimulator({ externalReference }: { externalReference: string }) {
  const router = useRouter();
  const [state, setState] = useState<SimulationState>({ phase: "idle" });
  useErrorSnackbar(state.phase === "failed" ? state.message : null);

  async function simulate(action: SimulatedDebitAction): Promise<void> {
    setState({ phase: "running" });
    try {
      const debit = await simulateAutoDebit(externalReference, action);
      if (GOES_TO_RESULT[action]) {
        // Stays "running" so nobody can simulate twice while the result page loads.
        router.replace(autoDebitResultHref(externalReference));
        return;
      }
      setState({ phase: "charged", debit });
    } catch (error) {
      setState(failureState(error));
    }
  }

  if (state.phase === "off") {
    return <MessageCard title="Simulador desactivado" body="Los débitos van por Mercado Pago." />;
  }
  if (state.phase === "not-found") {
    return <MessageCard title="No encontramos el débito" body="Revisá el link o contactá a MOVE." />;
  }

  return (
    <Card>
      <h2 className="font-display text-2xl font-black uppercase">Simulador de débitos (desarrollo)</h2>
      <p className="mt-3 text-sm text-muted">Elegí qué pasa con el débito para continuar sin Mercado Pago.</p>
      {state.phase === "charged" ? (
        <p role="status" className="mt-4 text-sm">
          {chargedText(state.debit)}
        </p>
      ) : null}
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {ACTION_BUTTONS.map(({ action, label, variant }) => (
          <Button
            key={action}
            type="button"
            variant={variant}
            disabled={state.phase === "running"}
            onClick={() => void simulate(action)}
            touchTarget
          >
            {label}
          </Button>
        ))}
      </div>
    </Card>
  );
}

export function AutoDebitSimulator({ externalReference }: { externalReference: string | null }) {
  if (!externalReference) return <MessageCard title="No encontramos el débito" body="Falta la referencia del débito." />;
  return <DebitSimulator externalReference={externalReference} />;
}
