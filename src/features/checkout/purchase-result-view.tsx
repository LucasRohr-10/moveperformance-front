import Link from "next/link";

import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Notice } from "@/components/ui/notice";
import { StatusBadge } from "@/components/ui/status-badge";
import { SuccessBadge } from "@/components/ui/success-badge";
import { cn } from "@/lib/cn";

import { TRANSFER_HOW_TO } from "./present-checkout";
import type { PurchaseResultModel } from "./present-purchase-result";
import { TransferDetails } from "./transfer-details";

export const CONSULTING_PAYMENT_MESSAGE = "Consultando tu pago…";

const TITLE_CLASS = "font-display text-2xl font-black uppercase";

const RESULT_ACTION_CLASS = cn(buttonVariants({ variant: "primary", touchTarget: true }), "mt-6");
const RESULT_SECONDARY_CLASS = cn(buttonVariants({ variant: "secondary", touchTarget: true }), "mt-6");

// The pick that timed out while the user was paying. Says so plainly — and says that
// neither the payment nor the booking was affected by it.
function SelectionNote({ note }: { note: string }) {
  return <p className="mt-4 text-[13px] leading-relaxed text-muted">{note}</p>;
}

// The approved result drops the card and the page title above it (see `data-purchase-approved` in the page).
function ApprovedResult({ model }: { model: PurchaseResultModel }): React.JSX.Element {
  return (
    <div data-purchase-approved="" className="mx-auto max-w-md text-center">
      <SuccessBadge label={model.badge.label} className="mx-auto" />
      <h2 className="mt-5 font-display text-4xl font-black uppercase tracking-tight">{model.title}</h2>
      <p className="mt-4 text-sm text-muted">{model.body}</p>
      {model.details.length > 0 ? (
        <dl className="mt-5 space-y-3 text-left text-sm">
          {model.details.map(({ label, value }) => (
            <div key={label} className="flex justify-between gap-4">
              <dt className="text-muted">{label}</dt>
              <dd className="text-right font-medium">{value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      {model.transferDetails ? (
        <div className="mt-6 text-left">
          <p className="text-sm text-muted">{TRANSFER_HOW_TO}</p>
          <TransferDetails text={model.transferDetails} className="pl-0" />
        </div>
      ) : null}
      {model.selectionNote ? <SelectionNote note={model.selectionNote} /> : null}
      {model.action ? (
        <Link href={model.action.href} className={cn(buttonVariants({ fullWidth: true, touchTarget: true }), "mt-10")}>
          {model.action.label}
        </Link>
      ) : null}
      {model.secondaryAction ? (
        <Link
          href={model.secondaryAction.href}
          className={cn(buttonVariants({ variant: "secondary", fullWidth: true, touchTarget: true }), "mt-3")}
        >
          {model.secondaryAction.label}
        </Link>
      ) : null}
    </div>
  );
}

export function PurchaseResultView({
  model,
  onRecheck,
}: {
  model: PurchaseResultModel;
  onRecheck: () => void;
}): React.JSX.Element {
  if (model.badge.tone === "success") return <ApprovedResult model={model} />;

  return (
    <Card aria-busy={model.isWaiting}>
      <StatusBadge label={model.badge.label} tone={model.badge.tone} />
      <h2 className={cn("mt-3", TITLE_CLASS)}>{model.title}</h2>
      {model.isWaiting ? (
        <Notice tone="info" busy role={null} className="mt-3">
          {model.body}
        </Notice>
      ) : (
        <p className="mt-3 text-sm text-muted">{model.body}</p>
      )}
      {model.details.length > 0 ? (
        <dl className="mt-5 space-y-3 text-sm">
          {model.details.map(({ label, value }) => (
            <div key={label} className="flex justify-between gap-4">
              <dt className="text-muted">{label}</dt>
              <dd className="text-right font-medium">{value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      {model.selectionNote ? <SelectionNote note={model.selectionNote} /> : null}
      <div className="flex flex-wrap gap-x-3">
        {model.action ? (
          <Link href={model.action.href} className={RESULT_ACTION_CLASS}>
            {model.action.label}
          </Link>
        ) : null}
        {model.secondaryAction ? (
          <Link href={model.secondaryAction.href} className={RESULT_SECONDARY_CLASS}>
            {model.secondaryAction.label}
          </Link>
        ) : null}
        {model.canRecheck ? (
          <Button type="button" variant="secondary" onClick={onRecheck} touchTarget className="mt-6">
            Volver a consultar
          </Button>
        ) : null}
      </div>
    </Card>
  );
}
