import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { SectionLabel } from "@/components/ui/section-label";
import { StatusBadge } from "@/components/ui/status-badge";
import { AutoDebitLine } from "@/features/auto-debits";
import { cn } from "@/lib/cn";

import type { PerformancePlanModel, UpcomingPlanModel } from "./present-subscriptions";

export interface PerformancePlanCardProps {
  plan: PerformancePlanModel;
  upcoming: UpcomingPlanModel[];
}

export function PerformancePlanCard({ plan, upcoming }: PerformancePlanCardProps) {
  const { progress, periodLine, renewal, expiredCta, unpaidLine } = plan;

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <SectionLabel>Performance · Tu plan</SectionLabel>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h2 className="break-words font-display text-2xl font-extrabold">{plan.title}</h2>
            <StatusBadge label={plan.badge.label} tone={plan.badge.tone} />
          </div>
          {periodLine ? (
            <p className="mt-2 text-sm text-muted">
              {periodLine.lead}
              <span className="font-semibold text-white">{periodLine.emphasis}</span>
            </p>
          ) : null}
          {expiredCta ? (
            <div className="mt-3">
              <p className="text-sm text-muted">{expiredCta.text}</p>
              {expiredCta.link ? (
                <Link
                  href={expiredCta.link.href}
                  className={cn(buttonVariants({ variant: "primary", touchTarget: true }), "mt-4")}
                >
                  {expiredCta.link.label}
                </Link>
              ) : null}
            </div>
          ) : null}
        </div>
        {progress ? (
          <div className="sm:text-right">
            <p>
              <span
                className={cn(
                  "block font-display text-3xl font-extrabold leading-none",
                  progress.daysLeftTone === "warning" && "text-warning",
                )}
              >
                {progress.daysLeftValue}
              </span>
              <span className="mt-1 block text-xs text-muted">{progress.daysLeftCaption}</span>
            </p>
            {renewal ? (
              <Link
                href={renewal.href}
                className={cn(buttonVariants({ variant: "primary", touchTarget: true }), "mt-4")}
              >
                {renewal.label}
              </Link>
            ) : null}
          </div>
        ) : null}
      </div>
      {progress ? (
        <div className="mt-6">
          <ProgressBar
            className="h-2 bg-line"
            percent={progress.percent}
            label={progress.label}
            valueText={progress.valueText}
          />
          <div className="mt-2 flex justify-between text-xs text-muted">
            <span>{progress.startText}</span>
            <span>{progress.endText}</span>
          </div>
        </div>
      ) : null}
      {unpaidLine ? <p className="mt-4 text-sm text-muted">{unpaidLine}</p> : null}
      {upcoming.length > 0 ? (
        <>
          <hr className="my-6 border-line" />
          <ul className="space-y-3">
            {upcoming.map((queued) => (
              <li key={queued.id}>
                <UpcomingPlanNotice plan={queued} />
              </li>
            ))}
          </ul>
        </>
      ) : null}
      <AutoDebitLine service="performance" paidUntil={plan.endsOn} />
    </Card>
  );
}

function UpcomingPlanNotice({ plan }: { plan: UpcomingPlanModel }) {
  return (
    <div className="flex items-start gap-3 rounded border border-info/30 bg-info/5 px-4 py-3">
      <svg
        aria-hidden="true"
        className="mt-0.5 h-5 w-5 shrink-0 text-info"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      >
        <path d="M12.5 21H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v5" />
        <path d="M16 3v4M8 3v4M4 11h16M16 19h6M19 16v6" />
      </svg>
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-semibold">{plan.title}</h3>
          <StatusBadge label={plan.badge.label} tone={plan.badge.tone} />
        </div>
        <p className="mt-1 text-xs text-muted">{plan.periodText}</p>
      </div>
    </div>
  );
}
