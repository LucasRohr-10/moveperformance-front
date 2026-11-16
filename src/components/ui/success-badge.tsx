import { cn } from "@/lib/cn";

interface SuccessBadgeProps {
  // Names the tick for screen readers; without it the tick is decoration.
  label?: string;
  className?: string;
}

export function SuccessBadge({ label, className }: SuccessBadgeProps) {
  return (
    <div
      {...(label ? { role: "img", "aria-label": label } : { "aria-hidden": true })}
      className={cn(
        "flex h-14 w-14 items-center justify-center rounded-full border border-success/40 bg-success/10 text-success",
        className,
      )}
    >
      <svg
        aria-hidden="true"
        className="h-7 w-7"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M5 12.5l4.5 4.5L19 7.5" />
      </svg>
    </div>
  );
}
