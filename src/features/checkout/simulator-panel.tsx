"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useErrorSnackbar } from "@/components/ui/snackbar";
import { ApiError } from "@/lib/api/errors";
import type { SimulateOutcome } from "@/lib/api/types";

import { simulatePayment } from "./checkout-api";
import { CheckoutMessageCard } from "./checkout-message-card";
import { resultHref } from "./checkout-routes";

type SimulationState =
  | { phase: "idle" }
  | { phase: "running" }
  | { phase: "off" }
  | { phase: "not-found" }
  | { phase: "failed"; message: string };

const NETWORK_ERROR_MESSAGE = "No pudimos simular el pago. Probá de nuevo.";

const STATES_BY_ERROR_CODE: Partial<Record<string, SimulationState>> = {
  NOT_FOUND: { phase: "off" },
  PURCHASE_NOT_FOUND: { phase: "not-found" },
  VALIDATION_FAILED: { phase: "not-found" },
};

// The result page only learns about a rejection from the URL, as with Mercado Pago (D11).
const PROVIDER_STATUS: Record<SimulateOutcome, "rejected" | undefined> = {
  approved: undefined,
  rejected: "rejected",
};

const OUTCOME_BUTTONS: { outcome: SimulateOutcome; label: string; variant: "primary" | "secondary" }[] = [
  { outcome: "approved", label: "Aprobar", variant: "primary" },
  { outcome: "rejected", label: "Rechazar", variant: "secondary" },
];

function failureState(error: unknown): SimulationState {
  if (!(error instanceof ApiError)) return { phase: "failed", message: NETWORK_ERROR_MESSAGE };
  return STATES_BY_ERROR_CODE[error.body.code] ?? { phase: "failed", message: error.body.message };
}

function MissingPurchaseCard({ body }: { body: string }): React.JSX.Element {
  return <CheckoutMessageCard title="No encontramos la operación" body={body} action={null} />;
}

function PurchaseSimulator({ externalReference }: { externalReference: string }): React.JSX.Element {
  const router = useRouter();
  const [state, setState] = useState<SimulationState>({ phase: "idle" });
  useErrorSnackbar(state.phase === "failed" ? state.message : null);

  async function simulate(outcome: SimulateOutcome): Promise<void> {
    setState({ phase: "running" });
    try {
      await simulatePayment(externalReference, outcome);
      // Stays "running" so nobody can simulate twice while the result page loads.
      router.replace(resultHref(externalReference, PROVIDER_STATUS[outcome]));
    } catch (error) {
      setState(failureState(error));
    }
  }

  if (state.phase === "off") {
    return <CheckoutMessageCard title="Simulador desactivado" body="Los pagos van por Mercado Pago." action={null} />;
  }
  if (state.phase === "not-found") return <MissingPurchaseCard body="Revisá el link o contactá a MOVE." />;

  return (
    <Card>
      <h2 className="font-display text-2xl font-black uppercase">Simulador de pagos (desarrollo)</h2>
      <p className="mt-3 text-sm text-muted">Elegí el resultado del pago para continuar sin Mercado Pago.</p>
      <div className="mt-6 flex gap-3">
        {OUTCOME_BUTTONS.map(({ outcome, label, variant }) => (
          <Button
            key={outcome}
            type="button"
            variant={variant}
            disabled={state.phase === "running"}
            onClick={() => void simulate(outcome)}
            touchTarget
            className="flex-1"
          >
            {label}
          </Button>
        ))}
      </div>
    </Card>
  );
}

export function SimulatorPanel({ externalReference }: { externalReference: string | null }): React.JSX.Element {
  if (!externalReference) return <MissingPurchaseCard body="Falta la referencia del pago." />;
  return <PurchaseSimulator externalReference={externalReference} />;
}
