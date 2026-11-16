"use client";

import { Card } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { useSnackbar } from "@/components/ui/snackbar";
import { WhatsAppIcon, whatsappLink } from "@/features/followup";
import type { TodayBirthdayDto, TodayBirthdaysDto } from "@/lib/api/types";
import { cn } from "@/lib/cn";

import { birthdayWhatsappText, formatTimeOfDay, formatTodayHeading } from "../birthday-text";
import { recordWhatsappOpened } from "./staff-birthdays-api";

const RECORD_FAILED_MESSAGE = "No pudimos registrar el saludo.";

export interface BirthdaysTodayListProps {
  today: TodayBirthdaysDto;
  // The saved greeting, the one the WhatsApp text carries.
  message: string;
  whatsappEnabled: boolean;
  onRecorded(item: TodayBirthdayDto): void;
}

function initialsOf(name: string, lastName: string | null): string {
  return `${name.charAt(0)}${lastName?.charAt(0) ?? ""}`.toUpperCase();
}

function fullName({ name, lastName }: TodayBirthdayDto): string {
  return lastName ? `${name} ${lastName}` : name;
}

function metaOf(item: TodayBirthdayDto): string {
  const parts = [item.phone ?? "Sin teléfono"];
  if (item.mailSentAt) parts.push(`Mail enviado ${formatTimeOfDay(item.mailSentAt)}`);
  return parts.join(" · ");
}

export function BirthdaysTodayList({ today, message, whatsappEnabled, onRecorded }: BirthdaysTodayListProps) {
  const { showSnackbar } = useSnackbar();
  const count = today.items.length;

  // The link opens WhatsApp by itself; here only the greeting is recorded. A failure never blocks the chat.
  async function record(item: TodayBirthdayDto): Promise<void> {
    try {
      onRecorded(await recordWhatsappOpened(item.clientId));
    } catch {
      showSnackbar({ tone: "danger", title: RECORD_FAILED_MESSAGE });
    }
  }

  return (
    <Card padding="none" className="mt-4">
      <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">
          Cumpleaños de hoy · {formatTodayHeading(today.date)}
        </h2>
        <span className="shrink-0 text-[11px] text-muted">{count === 1 ? "1 cliente" : `${count} clientes`}</span>
      </div>
      {count === 0 ? (
        <p className="px-5 py-6 text-sm text-muted">Hoy no cumple nadie.</p>
      ) : (
        <ul className="divide-y divide-line">
          {today.items.map((item) => (
            <li key={item.clientId} className="flex flex-wrap items-center gap-3.5 px-5 py-3.5">
              <span
                aria-hidden="true"
                className="flex size-[34px] shrink-0 items-center justify-center rounded-full bg-white text-xs font-bold text-black"
              >
                {initialsOf(item.name, item.lastName)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">
                  {fullName(item)} · {item.age} años
                </p>
                <p className="mt-0.5 text-xs text-muted">{metaOf(item)}</p>
              </div>
              {whatsappEnabled && item.phone ? (
                <a
                  href={whatsappLink(item.phone, birthdayWhatsappText(item.name, message))}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => void record(item)}
                  className={cn(
                    buttonVariants({ variant: "secondary", size: "sm", touchTarget: true }),
                    "gap-2",
                    item.whatsappOpenedAt ? "text-muted" : "text-[#25D366]",
                  )}
                >
                  <WhatsAppIcon className="size-4" />
                  {item.whatsappOpenedAt
                    ? `WhatsApp abierto ${formatTimeOfDay(item.whatsappOpenedAt)}`
                    : "Saludar por WhatsApp"}
                </a>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
