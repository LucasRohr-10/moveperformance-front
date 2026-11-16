import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/cn";

export interface ComingSoonButtonProps {
  label: string;
  fullWidth?: boolean;
  className?: string;
}

export function ComingSoonButton({ label, fullWidth, className }: ComingSoonButtonProps) {
  return (
    <div className={cn("flex flex-col items-start gap-2", fullWidth && "w-full", className)}>
      <button
        type="button"
        disabled
        aria-disabled="true"
        className={cn(buttonVariants({ variant: "secondary", fullWidth }), "cursor-not-allowed")}
      >
        {label}
      </button>
      <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">
        Próximamente
      </span>
    </div>
  );
}
