import { cn } from "@/lib/cn";

type StatusBadgeTone = "success" | "warning" | "danger" | "info" | "neutral";

export interface StatusBadgeProps {
  label: string;
  tone: StatusBadgeTone;
}

const TONE_CLASSES: Record<StatusBadgeTone, string> = {
  success: "border-success/30 bg-success/10 text-success",
  warning: "border-warning/30 bg-warning/10 text-warning",
  danger: "border-danger/30 bg-danger/10 text-danger",
  info: "border-info/30 bg-info/10 text-info",
  neutral: "border-line bg-soft text-muted",
};

export function StatusBadge({ label, tone }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "rounded border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
        TONE_CLASSES[tone],
      )}
    >
      {label}
    </span>
  );
}
