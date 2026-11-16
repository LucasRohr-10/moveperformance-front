import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SectionLabel } from "@/components/ui/section-label";
import { StatusBadge } from "@/components/ui/status-badge";
import { AutoDebitLine } from "@/features/auto-debits";
import { cn } from "@/lib/cn";

import type { RecoveryPackModel, SessionSegmentsModel } from "./present-subscriptions";

export interface RecoveryPacksCardProps {
  packs: RecoveryPackModel[];
}

// Business dates are YYYY-MM-DD, so the text order is the date order.
const latestEnd = (packs: RecoveryPackModel[]): string | null =>
  packs.map(({ endsOn }) => endsOn).sort().at(-1) ?? null;

export function RecoveryPacksCard({ packs }: RecoveryPacksCardProps) {
  return (
    <Card>
      <SectionLabel>{packs.length === 1 ? "Recovery · Tu paquete" : "Recovery · Tus paquetes"}</SectionLabel>
      <ul className="divide-y divide-line">
        {packs.map((pack) => (
          <li key={pack.id} className="py-6 first:pt-2 last:pb-0">
            <RecoveryPack pack={pack} />
          </li>
        ))}
      </ul>
      <AutoDebitLine service="recovery" paidUntil={latestEnd(packs)} />
    </Card>
  );
}

function RecoveryPack({ pack }: { pack: RecoveryPackModel }) {
  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="break-words font-display text-2xl font-extrabold">{pack.title}</h2>
          {pack.badge ? <StatusBadge label={pack.badge.label} tone={pack.badge.tone} /> : null}
        </div>
        <div className="sm:text-right">
          <p>
            <span className="block font-display text-3xl font-extrabold leading-none">
              {pack.sessionsLeftValue} <span className="font-sans text-sm font-normal text-muted">{pack.sessionsTotalText}</span>
            </span>
            <span className="mt-1 block text-xs text-muted">{pack.sessionsCaption}</span>
          </p>
          {pack.renewal ? (
            <Link
              href={pack.renewal.href}
              className={cn(buttonVariants({ variant: "primary", touchTarget: true }), "mt-4")}
            >
              {pack.renewal.label}
            </Link>
          ) : null}
        </div>
      </div>
      <SessionSegments className="mt-6" segments={pack.segments} />
      <div className="mt-2 flex justify-between gap-4 text-xs text-muted">
        <span>{pack.startText}</span>
        <span className={cn(pack.expiryTone === "warning" && "text-warning")}>{pack.endText}</span>
      </div>
      {pack.unpaidLine ? <p className="mt-4 text-sm text-muted">{pack.unpaidLine}</p> : null}
    </>
  );
}

// One bar per session: it starts empty and each session used fills one in green.
function SessionSegments({ segments, className }: { segments: SessionSegmentsModel; className?: string }) {
  return (
    <div
      role="meter"
      aria-label={segments.label}
      aria-valuemin={0}
      aria-valuemax={segments.total}
      aria-valuenow={segments.used}
      aria-valuetext={segments.valueText}
      className={cn("flex gap-1.5", className)}
    >
      {Array.from({ length: segments.total }, (_, index) => (
        <span
          key={index}
          className={cn("h-2 flex-1 rounded-full", index < segments.used ? "bg-success" : "bg-line")}
        />
      ))}
    </div>
  );
}
