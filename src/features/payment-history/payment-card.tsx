"use client";

import { useId, useState } from "react";

import { StatusBadge } from "@/components/ui/status-badge";
import { cn } from "@/lib/cn";

import type { PaymentCardModel } from "./payment-card-model";
import { PaymentNote } from "./payment-note";
import { ReceiptButton } from "./receipt-button";

const KIND_ICONS: Record<PaymentCardModel["icon"], string[]> = {
  card: ["M2 7a2 2 0 012-2h16a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2z", "M2 10h20"],
  repeat: ["M17 2l4 4-4 4", "M3 11V9a3 3 0 013-3h15", "M7 22l-4-4 4-4", "M21 13v2a3 3 0 01-3 3H3"],
};

function KindIcon({ icon }: { icon: PaymentCardModel["icon"] }) {
  return (
    <span className="flex size-10 shrink-0 items-center justify-center rounded border border-line text-muted">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className="size-[18px]"
      >
        {KIND_ICONS[icon].map((path) => (
          <path key={path} d={path} />
        ))}
      </svg>
    </span>
  );
}

function Chevron({ isOpen }: { isOpen: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={cn("size-3.5 text-muted transition-transform", isOpen && "rotate-180")}
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

// One payment. The top row opens and closes the detail, which is a darker band inside the card, indented
// under the title, so it is clear whose detail it is.
export function PaymentCard({ model, defaultOpen = false }: { model: PaymentCardModel; defaultOpen?: boolean }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const detailId = useId();

  return (
    <div
      className={cn(
        "rounded border bg-card transition-colors hover:border-line-strong",
        isOpen ? "border-line-strong" : "border-line",
      )}
    >
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls={detailId}
        onClick={() => setIsOpen((open) => !open)}
        className="grid min-h-11 w-full grid-cols-[40px_1fr_14px] items-center gap-x-3.5 gap-y-1 p-4 text-left sm:grid-cols-[40px_1fr_auto_14px]"
      >
        <KindIcon icon={model.icon} />
        <span className="min-w-0">
          <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <span className="text-[15px] font-semibold">{model.title}</span>
            <StatusBadge label={model.badge.label} tone={model.badge.tone} />
          </span>
          <span className="mt-1 block text-xs text-muted">{model.subtitle}</span>
        </span>
        <span
          className={cn(
            "col-start-2 font-display text-lg font-bold whitespace-nowrap sm:col-start-auto",
            model.isAmountMuted && "text-muted line-through",
          )}
        >
          {model.amount}
        </span>
        <Chevron isOpen={isOpen} />
      </button>
      <div
        id={detailId}
        role="region"
        aria-label={model.title}
        hidden={!isOpen}
        className="border-t border-line bg-soft px-4 pb-4 pt-3.5 sm:pl-[68px]"
      >
        <PaymentNote note={model.note} />
        {model.rows.length > 0 ? (
          <dl className="mt-3">
            {model.rows.map((row) => (
              <div
                key={row.label}
                className="flex justify-between gap-4 border-t border-dashed border-line py-2 text-xs first:border-t-0"
              >
                <dt className="shrink-0 text-muted">{row.label}</dt>
                <dd className="text-right">{row.value}</dd>
              </div>
            ))}
          </dl>
        ) : null}
        {model.receiptPurchaseId === null ? null : <ReceiptButton purchaseId={model.receiptPurchaseId} />}
      </div>
    </div>
  );
}
