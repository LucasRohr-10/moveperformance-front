import { cn } from "@/lib/cn";

/** A sliding on/off switch matching the monochrome palette. The track is a label, so a click anywhere on it toggles. The visible text is the caller's job: `label` names it for assistive tech. */
export function Switch({
  id,
  checked,
  onChange,
  label,
  describedBy,
  hasError,
}: {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  describedBy?: string;
  hasError?: boolean;
}) {
  return (
    <label htmlFor={id} className="relative inline-flex h-6 w-10 shrink-0 cursor-pointer items-center">
      <input
        id={id}
        type="checkbox"
        role="switch"
        className="peer sr-only"
        aria-label={label}
        aria-checked={checked}
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        aria-describedby={describedBy}
        aria-invalid={hasError ? true : undefined}
      />
      <span
        aria-hidden="true"
        className={cn(
          "absolute inset-0 rounded-full border border-line bg-[#333] transition-colors",
          "peer-checked:border-white peer-checked:bg-white",
          "peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-white",
          hasError && "border-danger",
        )}
      />
      <span
        aria-hidden="true"
        className="pointer-events-none relative inline-block size-4 translate-x-1 rounded-full bg-muted transition-transform peer-checked:translate-x-5 peer-checked:bg-black"
      />
    </label>
  );
}
