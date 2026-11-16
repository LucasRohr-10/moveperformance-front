"use client";

import { useId } from "react";

import { cn } from "@/lib/cn";

import type { PaymentMode } from "./constants";
import type { OfflinePriceLine, PaymentModeOption } from "./present-checkout";
import { TransferDetails } from "./transfer-details";

// The full price crossed out, the discounted one in green and the percent; without a discount, just the price.
function PriceLine({ line }: { line: OfflinePriceLine }) {
  if (line.discounted === null) return <>{line.full}</>;

  return (
    <>
      <span className="mr-1.5 text-muted line-through">{line.full}</span>
      <span className="font-semibold text-success">{line.discounted}</span> ({line.percent}% off)
    </>
  );
}

const hasOfflinePoints = (option: PaymentModeOption): boolean => option.priceLine !== null || option.howTo !== null;

// The two points of a cash or transfer option: how much, and how it is paid.
function OfflinePoints({ option, id }: { option: PaymentModeOption; id: string }) {
  if (!hasOfflinePoints(option)) return null;

  return (
    <ul id={id} className="mt-1.5 ml-4 list-disc space-y-0.5 text-[12.5px] leading-relaxed text-muted">
      {option.priceLine ? (
        <li>
          <PriceLine line={option.priceLine} />
        </li>
      ) : null}
      {option.howTo ? <li>{option.howTo}</li> : null}
    </ul>
  );
}

export function PaymentModeField({
  options,
  value,
  onChange,
}: {
  options: PaymentModeOption[];
  value: PaymentMode;
  onChange: (mode: PaymentMode) => void;
}) {
  const idPrefix = useId();
  // The reason is the same for every disabled option: it is said once, under the list.
  const disabledReason = options.find((option) => option.disabledReason !== null)?.disabledReason ?? null;
  const reasonId = `${idPrefix}-reason`;

  return (
    <fieldset className="space-y-3">
      <legend className="mb-3 text-[11px] uppercase tracking-[0.3em] text-muted">¿Cómo querés pagar?</legend>
      {options.map((option) => {
        const labelId = `${idPrefix}-${option.value}-label`;
        const descriptionId = `${idPrefix}-${option.value}-description`;
        const pointsId = `${idPrefix}-${option.value}-points`;
        const transferId = `${idPrefix}-${option.value}-transfer`;
        const isDisabled = option.disabledReason !== null;
        const radio = (
          <input
            id={`${idPrefix}-${option.value}`}
            type="radio"
            name="payment-mode"
            value={option.value}
            checked={option.value === value}
            onChange={() => {
              if (!isDisabled) onChange(option.value);
            }}
            aria-labelledby={labelId}
            aria-describedby={
              [
                option.description ? descriptionId : null,
                hasOfflinePoints(option) ? pointsId : null,
                option.transferDetails ? transferId : null,
                isDisabled ? reasonId : null,
              ]
                .filter((id) => id !== null)
                .join(" ") || undefined
            }
            aria-disabled={isDisabled ? true : undefined}
            className={cn("mt-1 self-start", isDisabled ? "cursor-not-allowed" : "cursor-pointer")}
          />
        );
        const text = (
          <div className="min-w-0 flex-1">
            <span id={labelId} className="block font-semibold">
              {option.label}
            </span>
            {option.description ? (
              <span id={descriptionId} className="mt-1 block text-sm text-muted">
                {option.description}
              </span>
            ) : null}
            <OfflinePoints option={option} id={pointsId} />
          </div>
        );
        const details = option.transferDetails ? (
          <TransferDetails text={option.transferDetails} textId={transferId} className="px-4 pb-4" />
        ) : null;

        return (
          <div
            key={option.value}
            className={cn(
              "min-h-11 rounded border",
              option.value === value ? "border-white" : "border-line",
              isDisabled && "opacity-45",
            )}
          >
            {isDisabled ? (
              // A disabled option has no label around its radio: touching it does nothing, but the keyboard still
              // reaches it, and with it the reason.
              <div className="flex gap-3 rounded p-4 focus-within:ring-2 focus-within:ring-white">
                {radio}
                <label htmlFor={`${idPrefix}-${option.value}`} className="min-w-0 flex-1 cursor-not-allowed">
                  {text}
                </label>
              </div>
            ) : (
              // The whole card is the label, so touching it anywhere chooses the option. The transfer details stay
              // outside it: copying them is not choosing.
              <label className="flex cursor-pointer gap-3 rounded p-4 focus-within:ring-2 focus-within:ring-white">
                {radio}
                {text}
              </label>
            )}
            {details}
          </div>
        );
      })}
      {disabledReason ? (
        <p id={reasonId} className="text-[12.5px] text-warning">
          {disabledReason}
        </p>
      ) : null}
    </fieldset>
  );
}
