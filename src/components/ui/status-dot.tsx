import { cn } from "@/lib/cn";

export type StatusDotTone = "success" | "warning" | "danger" | "info" | "neutral";

// Muted on purpose: a status never competes with the red accent, which is kept for
// what actually demands action. Only `danger` borrows the accent itself.
const TONE_CLASSES: Record<StatusDotTone, string> = {
  success: "bg-[#5a9e78]",
  warning: "bg-[#bf8b2e]",
  danger: "bg-[#e3262f]",
  info: "bg-[#8a8a8a]",
  neutral: "bg-[#6b6b6b]",
};

export interface StatusDotProps {
  label: string;
  tone: StatusDotTone;
  className?: string;
}

/** An 8px dot plus its label: the quiet alternative to `StatusBadge`'s tinted pill,
 *  for places where the status is context rather than the point of the screen. */
export function StatusDot({ label, tone, className }: StatusDotProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 whitespace-nowrap text-[11px] uppercase tracking-[0.2em] text-[#bdbdbd]",
        className,
      )}
    >
      <span aria-hidden="true" className={cn("size-2 shrink-0 rounded-full", TONE_CLASSES[tone])} />
      {label}
    </span>
  );
}
