"use client";

import { type ReactNode, useState } from "react";

import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatBusinessDate } from "@/features/subscriptions/present-subscriptions";
import type { ContactDto, InactivityReasonDto } from "@/lib/api/types";

import type { AlertNotice } from "./alert-row";
import { ContactForm } from "./contact-form";
import { formatInstantDate, formatInstantDateTime } from "./followup-dates";
import { CHANNEL_LABELS, OUTCOME_LABELS, REASON_LABELS } from "./followup-labels";

interface HistoryRow {
  id: string;
  /** Sortable instant: newest first. */
  when: string;
  date: string;
  content: ReactNode;
}

function pauseSubtitle(pause: InactivityReasonDto, endedAt: string): string {
  return `${REASON_LABELS[pause.reason]} · ${formatInstantDate(pause.startedAt)} – ${formatInstantDate(endedAt)}`;
}

function activePauseSubtitle(pause: InactivityReasonDto): string {
  const until = pause.recontactOn ? `hasta el ${formatBusinessDate(pause.recontactOn)}` : "sin fecha de retorno";
  return `${REASON_LABELS[pause.reason]} · ${until}`;
}

function PendingContactLine({
  contact,
  clientId,
  clientName,
  onCompleted,
}: {
  contact: ContactDto;
  clientId: string;
  clientName: string;
  onCompleted: (notice: AlertNotice) => void;
}) {
  const [isCompleting, setIsCompleting] = useState(false);

  return (
    <>
      <p className="flex flex-wrap items-center gap-2">
        <span className="font-semibold">{CHANNEL_LABELS[contact.channel]}</span>
        <StatusBadge tone="warning" label="Pendiente de resultado" />
      </p>
      <p className="mt-0.5 text-xs text-muted">{`${contact.staffName} · ${formatInstantDateTime(contact.createdAt)}`}</p>
      {isCompleting ? (
        <ContactForm
          clientId={clientId}
          clientName={clientName}
          completing={{ contactId: contact.id, channel: contact.channel }}
          onDone={(notice) => {
            setIsCompleting(false);
            onCompleted(notice);
          }}
          onCancel={() => setIsCompleting(false)}
        />
      ) : (
        <Button type="button" variant="secondary" size="sm" onClick={() => setIsCompleting(true)} touchTarget className="mt-2">
          Completar resultado
        </Button>
      )}
    </>
  );
}

function completedContactRow(contact: ContactDto): ReactNode {
  return (
    <>
      <p className="font-semibold">
        {`${CHANNEL_LABELS[contact.channel]} · ${contact.outcome ? OUTCOME_LABELS[contact.outcome] : "Pendiente de resultado"}`}
      </p>
      {contact.note ? <p className="mt-0.5 text-muted">{contact.note}</p> : null}
      <p className="mt-0.5 text-xs text-muted">{`${contact.staffName} · ${formatInstantDateTime(contact.createdAt)}`}</p>
    </>
  );
}

/** Contacts, pauses and the active pause (if any), merged into one feed, newest first. */
function buildFeed(
  contacts: ContactDto[],
  pauses: InactivityReasonDto[],
  activePause: InactivityReasonDto | null,
  clientId: string | undefined,
  clientName: string | undefined,
  onCompleted: ((notice: AlertNotice) => void) | undefined,
): HistoryRow[] {
  const contactRows: HistoryRow[] = contacts.map((contact) => ({
    id: `contact-${contact.id}`,
    when: contact.createdAt,
    date: formatInstantDate(contact.createdAt),
    content:
      contact.outcome === null && clientId !== undefined && onCompleted !== undefined ? (
        <PendingContactLine contact={contact} clientId={clientId} clientName={clientName ?? ""} onCompleted={onCompleted} />
      ) : (
        completedContactRow(contact)
      ),
  }));

  const pauseRows: HistoryRow[] = pauses
    .filter((pause): pause is InactivityReasonDto & { endedAt: string } => pause.endedAt !== null)
    .map((pause) => ({
      id: `pause-${pause.id}`,
      when: pause.startedAt,
      date: formatInstantDate(pause.startedAt),
      content: (
        <>
          <p className="font-semibold">Pausa finalizada</p>
          <p className="mt-0.5 text-muted">{pauseSubtitle(pause, pause.endedAt)}</p>
        </>
      ),
    }));

  const activeRow: HistoryRow[] = activePause
    ? [
        {
          id: `pause-${activePause.id}`,
          when: activePause.startedAt,
          date: formatInstantDate(activePause.startedAt),
          content: (
            <>
              <p className="font-semibold">Seguimiento pausado</p>
              <p className="mt-0.5 text-muted">{activePauseSubtitle(activePause)}</p>
            </>
          ),
        },
      ]
    : [];

  return [...contactRows, ...pauseRows, ...activeRow].sort((a, b) => b.when.localeCompare(a.when));
}

/** The client's follow-up timeline: contacts and pauses, newest first. */
export function FollowupHistory({
  contacts,
  pauses,
  activePause,
  clientId,
  clientName,
  onCompleted,
}: {
  contacts: ContactDto[];
  pauses: InactivityReasonDto[];
  activePause: InactivityReasonDto | null;
  /** Needed to log the outcome of a pending contact inline. Omitted where there's nothing pending to complete. */
  clientId?: string;
  clientName?: string;
  onCompleted?: (notice: AlertNotice) => void;
}) {
  const rows = buildFeed(contacts, pauses, activePause, clientId, clientName, onCompleted);
  return (
    <div className="border-t border-line bg-soft px-4 pt-5 pb-8 sm:px-7 sm:pb-6">
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.3em] text-muted">Historial</h3>
      {rows.length === 0 ? (
        <p className="mt-2.5 text-sm text-muted">Todavía no hay contactos registrados.</p>
      ) : (
        <div className="mt-1.5 flex flex-col">
          {rows.map((row) => (
            <div
              key={row.id}
              data-testid="history-row"
              className="grid grid-cols-[72px_1fr] gap-3 border-b border-line py-3 text-[13px] last:border-b-0"
            >
              <span className="text-muted">{row.date}</span>
              <div>{row.content}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
