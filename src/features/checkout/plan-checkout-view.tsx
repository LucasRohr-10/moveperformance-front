import type { ReactNode } from "react";

import { Card } from "@/components/ui/card";
import { SectionLabel } from "@/components/ui/section-label";

import type { CheckoutSummaryModel, RenewalNoticeModel } from "./present-checkout";

// aria-hidden: the feature text itself carries the meaning.
function CheckIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4 shrink-0 text-white"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="square"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function SummaryRows({ rows }: { rows: CheckoutSummaryModel["rows"] }) {
  return (
    <dl className="space-y-3 text-sm">
      {rows.map((row) => (
        <div key={row.label} className="flex justify-between gap-4">
          <dt className="text-muted">{row.label}</dt>
          <dd className="text-right font-medium">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

// The eyebrow treatment this page uses: tighter and lighter than `SectionLabel`'s
// default (11px/tracking-0.35em/medium) — matches the reference exactly instead.
function Eyebrow({ children }: { children: ReactNode }) {
  return <SectionLabel className="text-[10px] font-normal tracking-[0.3em]">{children}</SectionLabel>;
}

// The "Cuándo empieza" section: a two-segment bar (elapsed vs. new plan) standing
// in for the warning-styled alert box the rest of the app uses for this notice —
// here it is informational, not a warning, so it skips the warning tokens. The bar
// and the two date columns share one 4-col-gap grid, same as the reference.
function RenewalProgress({ notice }: { notice: RenewalNoticeModel }) {
  return (
    <div className="flex flex-col gap-4">
      <Eyebrow>Cuándo empieza</Eyebrow>
      <div className="grid grid-cols-2 gap-1">
        <div className="h-1 bg-neutral-700" />
        <div className="h-1 bg-white" />
        {notice.rows.map((row) => (
          <div key={row.label} className="flex flex-col gap-1 pt-2.5">
            <span className="text-xs text-muted">{row.label}</span>
            <span className="text-sm font-semibold">{row.value}</span>
          </div>
        ))}
      </div>
      <p className="text-sm leading-relaxed text-muted">{notice.title}</p>
    </div>
  );
}

/** The "Resumen" card: wherever the options, the total and the pay button go. A separate piece so the
 * caller can swap it out entirely (e.g. for `AutoDebitBlock`) without nesting cards. */
export function PlanSummaryCard({ children }: { children: ReactNode }) {
  return (
    <Card className="flex flex-col gap-5">
      <Eyebrow>Resumen</Eyebrow>
      {children}
    </Card>
  );
}

/**
 * The checkout page's two-column layout, shared by the plan-checkout and
 * booking-checkout flows: details on the left, the right column (usually
 * `PlanSummaryCard`, or `AutoDebitBlock` when blocked) passed in whole.
 */
export function PlanCheckoutView({
  model,
  notice = null,
  rightColumn,
}: {
  model: CheckoutSummaryModel;
  /** Sits under the rows of the plan, in the left column. */
  notice?: ReactNode;
  rightColumn: ReactNode;
}) {
  return (
    <div className="grid gap-10 [grid-template-columns:repeat(auto-fit,minmax(min(100%,340px),1fr))]">
      <div className="flex flex-col gap-9">
        <div className="flex flex-col gap-1.5">
          <Eyebrow>{model.eyebrow}</Eyebrow>
          {model.title ? <p className="font-display text-[26px] uppercase">{model.title}</p> : null}
        </div>

        {model.rows.length > 0 ? <SummaryRows rows={model.rows} /> : null}

        {notice}

        {model.features.length > 0 ? (
          <ul className="flex flex-col border-t border-line">
            {model.features.map((feature) => (
              <li key={feature} className="flex items-center gap-3.5 border-b border-line py-3.5 text-sm text-white/80">
                <CheckIcon />
                {feature}
              </li>
            ))}
          </ul>
        ) : null}

        {model.renewalNotice ? <RenewalProgress notice={model.renewalNotice} /> : null}

        {model.notes.map((note) => (
          <p key={note} className="text-sm leading-relaxed text-muted">
            {note}
          </p>
        ))}
      </div>

      {rightColumn}
    </div>
  );
}
