"use client";

import Link from "next/link";

import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Notice } from "@/components/ui/notice";
import { StatusBadge } from "@/components/ui/status-badge";
import { cn } from "@/lib/cn";

import { presentAutoDebitResult, type AutoDebitResultModel } from "./present-auto-debit-result";
import { useAutoDebitStatus } from "./use-auto-debit-status";

function AutoDebitResultCard({ model, onRetry }: { model: AutoDebitResultModel; onRetry: () => void }) {
  return (
    <Card role={model.isAlert ? "alert" : undefined} aria-busy={model.isWaiting}>
      {model.badge ? <StatusBadge label={model.badge.label} tone={model.badge.tone} /> : null}
      <h2 className={cn("font-display text-2xl font-black uppercase", model.badge ? "mt-3" : null)}>{model.title}</h2>
      {model.body && model.isWaiting ? (
        <Notice tone="info" busy role={null} className="mt-3">
          {model.body}
        </Notice>
      ) : model.body ? (
        <p className="mt-3 text-sm text-muted">{model.body}</p>
      ) : null}
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
      <div className="flex flex-wrap gap-x-3">
        {model.action ? (
          <Link
            href={model.action.href}
            className={cn(buttonVariants({ variant: "primary", touchTarget: true }), "mt-6")}
          >
            {model.action.label}
          </Link>
        ) : null}
        {model.retryLabel ? (
          <Button type="button" variant="secondary" onClick={onRetry} touchTarget className="mt-6">
            {model.retryLabel}
          </Button>
        ) : null}
      </div>
    </Card>
  );
}

function AutoDebitStatusContent({ externalReference }: { externalReference: string }) {
  const { state, recheck } = useAutoDebitStatus(externalReference);
  return <AutoDebitResultCard model={presentAutoDebitResult(state)} onRetry={recheck} />;
}

/** The live region exists from the first render, so screen readers announce the change from pending to active. */
export function AutoDebitResult({ externalReference }: { externalReference: string | null }) {
  return (
    <div role="status" aria-live="polite">
      {externalReference ? (
        <AutoDebitStatusContent externalReference={externalReference} />
      ) : (
        <AutoDebitResultCard model={presentAutoDebitResult({ kind: "not-found" })} onRetry={() => undefined} />
      )}
    </div>
  );
}
