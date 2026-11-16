import { cn } from "@/lib/cn";

export interface ProgressBarProps {
  percent: number;
  label: string;
  valueText: string;
  className?: string;
}

export function ProgressBar({ percent, label, valueText, className }: ProgressBarProps) {
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      aria-valuetext={valueText}
      className={cn("h-1.5 overflow-hidden rounded-full bg-soft", className)}
    >
      <div className="h-full rounded-full bg-success" style={{ width: `${percent}%` }} />
    </div>
  );
}
