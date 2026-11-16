import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

type NoticeTone = "success" | "warning" | "danger" | "info" | "neutral";

// Same three-opacity treatment as `StatusBadge` and the `destructive` button
// variant, so a result message reads as part of the system instead of a loose
// `text-muted` line.
const TONE_CLASSES: Record<NoticeTone, string> = {
  success: "border-success/30 bg-success/10 text-success",
  warning: "border-warning/30 bg-warning/10 text-warning",
  danger: "border-danger/30 bg-danger/10 text-danger",
  info: "border-info/30 bg-info/10 text-info",
  neutral: "border-line bg-soft text-white",
};

function NoticeIcon({ tone }: { tone: NoticeTone }) {
  if (tone === "success") {
    return (
      <svg
        className="mt-0.5 size-4 shrink-0"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M3 8.5l3 3 7-7" />
      </svg>
    );
  }
  if (tone === "warning" || tone === "danger") {
    return (
      <svg
        className="mt-0.5 size-4 shrink-0"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M8 2.2l6.2 11.3H1.8z" />
        <path d="M8 6.8v3M8 11.7v.1" />
      </svg>
    );
  }
  if (tone === "info") {
    return (
      <svg
        className="mt-0.5 size-4 shrink-0"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="round"
        aria-hidden="true"
      >
        <circle cx="8" cy="8" r="6.2" />
        <path d="M8 7.2v3.6M8 5v.1" />
      </svg>
    );
  }
  return <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-current" aria-hidden="true" />;
}

// Replaces the tone icon while the notice is waiting for something (e.g. Mercado Pago).
function NoticeSpinner() {
  return (
    <span
      data-testid="notice-spinner"
      aria-hidden="true"
      className="mt-0.5 size-4 shrink-0 rounded-full border-2 border-current/25 border-t-current motion-safe:animate-spin"
    />
  );
}

export interface NoticeProps {
  tone: NoticeTone;
  children: ReactNode;
  /** null when the notice sits inside a region that already announces (e.g. a live result card). */
  role?: "status" | "alert" | null;
  /** Waiting for something: a spinner replaces the icon. */
  busy?: boolean;
  className?: string;
}

export function Notice({ tone, children, role = "status", busy = false, className }: NoticeProps) {
  return (
    <div
      role={role ?? undefined}
      aria-busy={busy || undefined}
      className={cn(
        "flex items-start gap-3 rounded border px-4 py-3 text-[13px] leading-relaxed",
        TONE_CLASSES[tone],
        className,
      )}
    >
      {busy ? <NoticeSpinner /> : <NoticeIcon tone={tone} />}
      <div className="flex-1">{children}</div>
    </div>
  );
}
