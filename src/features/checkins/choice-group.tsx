import { useId } from "react";

import { RadioChip } from "@/components/ui/radio-chip";

export interface ChoiceOption<T extends string> {
  value: T;
  label: string;
}

/** One question with its options as chips: radios inside a fieldset, so a screen reader reads the question first. */
export function ChoiceGroup<T extends string>({
  legend,
  options,
  value,
  onChange,
  error,
  disabled,
}: {
  legend: string;
  options: readonly ChoiceOption<T>[];
  value: T | "";
  onChange: (value: T) => void;
  error: string | undefined;
  disabled: boolean;
}) {
  const name = useId();
  return (
    <fieldset role="radiogroup" aria-invalid={error ? true : undefined} disabled={disabled}>
      <legend className="text-sm font-semibold">{legend}</legend>
      <div className="mt-3 flex flex-wrap gap-2">
        {options.map((option) => (
          <RadioChip
            key={option.value}
            name={name}
            value={option.value}
            checked={value === option.value}
            onChange={() => onChange(option.value)}
            disabled={disabled}
          >
            {option.label}
          </RadioChip>
        ))}
      </div>
      {error ? (
        <p role="alert" className="mt-2 text-xs text-danger">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}
