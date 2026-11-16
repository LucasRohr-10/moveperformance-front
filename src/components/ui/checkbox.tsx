import { cn } from "@/lib/cn";

/** A square checkbox matching the monochrome palette, in place of the browser default. */
export function Checkbox({
  id,
  checked,
  onChange,
  hasError,
}: {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  hasError?: boolean;
}) {
  return (
    <span className="relative inline-flex size-[18px] shrink-0">
      <input
        id={id}
        type="checkbox"
        className="peer sr-only"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-0 rounded border border-line bg-soft",
          "peer-checked:border-white peer-checked:bg-white",
          "peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-white",
          hasError && "border-danger",
        )}
      />
      <svg
        aria-hidden="true"
        viewBox="0 0 16 16"
        className="pointer-events-none absolute inset-0 m-auto size-[10px] text-black opacity-0 peer-checked:opacity-100"
      >
        <path d="M3 8l3.5 3.5L13 4.5" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}
