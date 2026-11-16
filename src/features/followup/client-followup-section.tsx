"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useSnackbar } from "@/components/ui/snackbar";
import { formatBusinessDate } from "@/features/subscriptions/present-subscriptions";
import { cn } from "@/lib/cn";

import type { AlertNotice } from "./alert-row";
import { ClientContactPanel } from "./client-contact-panel";
import { ClientPausePanel } from "./client-pause-panel";
import { FollowupHistory } from "./followup-history";
import { REASON_LABELS } from "./followup-labels";
import { useClientFollowup } from "./use-client-followup";

type View = "contact" | "pause";

function EndConfirmation({ onBack, onConfirm }: { onBack: () => void; onConfirm: () => void }) {
  const groupRef = useRef<HTMLDivElement>(null);

  // The confirmation opens where the button was, so the focus goes to "Volver", the safe choice.
  useEffect(() => {
    groupRef.current?.querySelector("button")?.focus();
  }, []);

  return (
    <div ref={groupRef} role="group" aria-label="Finalizar pausa" className="mx-7 mb-5 rounded border border-line p-4">
      <p className="text-sm">¿Finalizar la pausa? El cliente vuelve a recibir alertas según su plan y su asistencia.</p>
      <div className="mt-3 flex flex-wrap gap-3">
        <Button type="button" variant="secondary" size="sm" onClick={onBack} touchTarget>
          Volver
        </Button>
        <Button type="button" size="sm" onClick={onConfirm} touchTarget>
          Sí, finalizar
        </Button>
      </div>
    </div>
  );
}

/** What staff know about the follow-up of one client: the pause, the contacts and the past pauses. */
export function ClientFollowupSection({
  clientId,
  clientName = "",
  clientPhone,
  clientEmail,
}: {
  clientId: string;
  /** For the contact panel's recipient line. Omitted by callers that don't have it yet (e.g. existing tests). */
  clientName?: string;
  /** So the contact panel can open WhatsApp/tel directly. Omitted where unknown (e.g. from an alert). */
  clientPhone?: string | null;
  clientEmail?: string | null;
}) {
  const { state, reload, endActivePause } = useClientFollowup(clientId);
  const [view, setView] = useState<View>("contact");
  const [isConfirmingEnd, setIsConfirmingEnd] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const { showSnackbar } = useSnackbar();
  const sectionRef = useRef<HTMLDivElement>(null);
  const announce = (notice: AlertNotice): void =>
    showSnackbar({ tone: notice.ok ? "success" : "danger", title: notice.message });

  function closeConfirmation(): void {
    setIsConfirmingEnd(false);
    sectionRef.current?.querySelector<HTMLButtonElement>('[data-action="end"]')?.focus();
  }

  async function confirmEnd(): Promise<void> {
    if (isEnding) return;
    setIsEnding(true);
    const result = await endActivePause();
    setIsEnding(false);
    setIsConfirmingEnd(false);
    announce(result.ok ? { ok: true, message: "Pausa finalizada." } : { ok: false, message: result.message });
  }

  function finish(notice: AlertNotice): void {
    setView("contact");
    announce(notice);
    reload();
  }

  const title = (
    <h2 className="px-7 pt-6 text-[11px] font-semibold uppercase tracking-[0.3em] text-muted">Seguimiento</h2>
  );
  if (state === "loading") {
    return (
      <Card padding="none">
        {title}
        <p aria-busy="true" className="px-7 pt-2.5 pb-6 text-sm text-muted">
          Cargando seguimiento…
        </p>
      </Card>
    );
  }
  if (state === "error") {
    return (
      <Card padding="none">
        {title}
        <p role="alert" className="px-7 pt-2.5 text-sm text-danger">
          No pudimos cargar el seguimiento.
        </p>
        <Button type="button" variant="secondary" size="sm" onClick={reload} touchTarget className="mx-7 mt-3 mb-6">
          Reintentar
        </Button>
      </Card>
    );
  }

  const { pause, pauses, contacts } = state.data;

  return (
    <Card padding="none">
      <div ref={sectionRef} className="flex items-start justify-between gap-3 px-4 pt-5 pb-4 sm:gap-4 sm:px-7 sm:pt-6 sm:pb-5">
        <div>
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.3em] text-muted">Seguimiento</h2>
          <p data-testid="followup-status" className="mt-2.5 flex items-center gap-2 text-[15px] font-semibold">
            <span aria-hidden="true" className={cn("size-2 rounded-full", pause ? "bg-muted" : "bg-success")} />
            {pause ? "Seguimiento pausado" : "Seguimiento activo"}
          </p>
          <p data-testid="followup-detail" className="mt-1 text-[13px] text-muted">
            {pause
              ? `${REASON_LABELS[pause.reason]} · ${pause.recontactOn ? `hasta el ${formatBusinessDate(pause.recontactOn)}` : "sin fecha de retorno"}`
              : "Recibís alertas si deja de venir."}
          </p>
        </div>
        {pause ? (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            data-action="end"
            aria-expanded={isConfirmingEnd}
            onClick={() => setIsConfirmingEnd(true)}
            touchTarget
            className="shrink-0"
          >
            Reanudar
          </Button>
        ) : null}
      </div>

      {isConfirmingEnd ? <EndConfirmation onBack={closeConfirmation} onConfirm={() => void confirmEnd()} /> : null}

      <div role="tablist" className="grid grid-cols-2 border-y border-line">
        <button
          type="button"
          role="tab"
          aria-selected={view === "contact"}
          onClick={() => setView("contact")}
          className={cn(
            "-mb-px border-b-2 py-4 text-[11px] font-semibold uppercase tracking-[0.2em] sm:py-3.5",
            view === "contact" ? "border-white bg-card text-white" : "border-transparent bg-soft text-muted",
          )}
        >
          Contactar
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={view === "pause"}
          aria-disabled={Boolean(pause)}
          disabled={Boolean(pause)}
          title={pause ? "Finalizá la pausa activa para registrar un nuevo motivo." : undefined}
          onClick={() => setView("pause")}
          className={cn(
            "-mb-px border-b-2 border-l border-line py-4 text-[11px] font-semibold uppercase tracking-[0.2em] sm:py-3.5",
            view === "pause" ? "border-b-white bg-card text-white" : "border-b-transparent bg-soft text-muted",
            pause && "cursor-not-allowed opacity-50",
          )}
        >
          Pausar
        </button>
      </div>

      {view === "contact" ? (
        <ClientContactPanel
          clientId={clientId}
          clientName={clientName}
          clientPhone={clientPhone}
          clientEmail={clientEmail}
          onSent={finish}
        />
      ) : (
        <ClientPausePanel clientId={clientId} onDone={finish} />
      )}

      <FollowupHistory
        contacts={contacts}
        pauses={pauses}
        activePause={pause}
        clientId={clientId}
        clientName={clientName}
        onCompleted={finish}
      />
    </Card>
  );
}
