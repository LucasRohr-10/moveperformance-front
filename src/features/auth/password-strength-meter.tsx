import { cn } from "@/lib/cn";

import { getPasswordChecks } from "./password-strength";

const METER_BARS = [0, 1, 2, 3];

export type PasswordStrengthTone = "default" | "success";

// What a met hint looks like: white in the public forms, green in the staff screens.
const TONE_CLASSES: Record<PasswordStrengthTone, { bar: string; text: string; tick: string }> = {
  default: { bar: "bg-white", text: "text-white", tick: "border-white bg-white text-black" },
  success: { bar: "bg-success", text: "text-success", tick: "border-success bg-success text-black" },
};

// Visual guidance under a password field: one bar per hint met, then the hints.
// Shared by the registration, the inline sign-up on /reservar and staff's client forms.
export function PasswordStrengthMeter({
  password,
  tone = "default",
}: {
  password: string;
  tone?: PasswordStrengthTone;
}) {
  const classes = TONE_CLASSES[tone];
  const checks = getPasswordChecks(password);
  const score = checks.filter((check) => check.ok).length;

  return (
    <>
      <div aria-hidden="true" className="mt-3 grid grid-cols-4 gap-1">
        {METER_BARS.map((index) => (
          <div key={index} className={cn("h-0.5 rounded-full", index < score ? classes.bar : "bg-line")} />
        ))}
      </div>
      <ul className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5">
        {checks.map((check) => (
          <li
            key={check.label}
            className={cn("flex items-center gap-2 text-xs", check.ok ? classes.text : "text-muted")}
          >
            <span
              aria-hidden="true"
              className={cn(
                "inline-flex h-3.5 w-3.5 items-center justify-center rounded-full border text-[8px] font-bold",
                check.ok ? classes.tick : "border-line",
              )}
            >
              {check.ok ? "✓" : ""}
            </span>
            <span>{check.label}</span>
          </li>
        ))}
      </ul>
    </>
  );
}
