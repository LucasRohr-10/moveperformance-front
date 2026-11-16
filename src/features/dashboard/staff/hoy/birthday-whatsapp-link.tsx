"use client";

import { useState } from "react";

import { buttonVariants } from "@/components/ui/button";
import { useSnackbar } from "@/components/ui/snackbar";
import { recordWhatsappOpened } from "@/features/birthdays";
import { formatSlotTime } from "@/features/bookings";
import { WhatsAppIcon } from "@/features/followup";
import { cn } from "@/lib/cn";

const RECORD_FAILED_MESSAGE = "No pudimos registrar el saludo.";

export interface BirthdayWhatsappLinkProps {
  clientId: string;
  /** The wa.me link, with the greeting already in it. */
  href: string;
  /** When the greeting was already opened; `null` if not. */
  openedAt: string | null;
}

/** The link opens WhatsApp by itself; the click only records when. A failed record never blocks the chat. */
export function BirthdayWhatsappLink({ clientId, href, openedAt }: BirthdayWhatsappLinkProps) {
  const { showSnackbar } = useSnackbar();
  const [opened, setOpened] = useState(openedAt);

  async function record(): Promise<void> {
    try {
      const item = await recordWhatsappOpened(clientId);
      setOpened(item.whatsappOpenedAt);
    } catch {
      showSnackbar({ tone: "danger", title: RECORD_FAILED_MESSAGE });
    }
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      onClick={() => void record()}
      className={cn(
        buttonVariants({ variant: "secondary", size: "sm", touchTarget: true }),
        "relative z-10 gap-2",
        opened ? "text-muted" : "text-[#25D366]",
      )}
    >
      <WhatsAppIcon className="size-4" />
      {opened ? `WhatsApp abierto ${formatSlotTime(opened)}` : "Saludar por WhatsApp"}
    </a>
  );
}
