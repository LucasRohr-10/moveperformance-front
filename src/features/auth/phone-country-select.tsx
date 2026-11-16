"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { getCountryCallingCode, type Country } from "react-phone-number-input";
import flags from "react-phone-number-input/flags";

import { cn } from "@/lib/cn";

interface CountryOption {
  value?: Country;
  label: string;
  divider?: boolean;
}

interface PhoneCountrySelectProps {
  value?: Country;
  onChange: (country?: Country) => void;
  options: CountryOption[];
  disabled?: boolean;
  readOnly?: boolean;
}

// Custom `countrySelectComponent` for `react-phone-number-input`: the library
// only ships a native `<select>` (or that same select with a flag icon next
// to it), neither of which can be searched by name or dial code. This
// reimplements it as a flag + calling-code trigger that opens a filterable
// listbox, matching the app's input styling instead of the library's own CSS
// (which is never imported).
export function PhoneCountrySelect({ value, onChange, options, disabled, readOnly }: PhoneCountrySelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [wasOpen, setWasOpen] = useState(open);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Reset the search on open, computed during render (not an effect) per
  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes.
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setQuery("");
  }

  const countries = useMemo(
    () => options.filter((option): option is CountryOption & { value: Country } => !option.divider && Boolean(option.value)),
    [options],
  );

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return countries;
    const normalizedDigits = normalized.replace(/[^\d]/g, "");
    return countries.filter((country) => {
      if (country.label.toLowerCase().includes(normalized)) return true;
      if (!normalizedDigits) return false;
      return getCountryCallingCode(country.value).includes(normalizedDigits);
    });
  }, [countries, query]);

  const selected = countries.find((country) => country.value === value);
  const SelectedFlag = selected ? flags[selected.value] : undefined;

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (open) searchInputRef.current?.focus();
  }, [open]);

  function select(country: Country) {
    onChange(country);
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative shrink-0 border-r border-line">
      <button
        type="button"
        disabled={disabled || readOnly}
        onClick={() => setOpen((isOpen) => !isOpen)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Elegir país"
        className="flex items-center gap-1.5 py-2.5 pr-2.5 pl-3.5 text-sm text-white outline-none disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className="flex h-3.5 w-5 items-center justify-center overflow-hidden rounded-[2px]">
          {SelectedFlag ? <SelectedFlag title={selected?.label ?? ""} /> : null}
        </span>
        <span className="tabular-nums">{selected ? `+${getCountryCallingCode(selected.value)}` : ""}</span>
        <svg
          aria-hidden="true"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          className={cn("h-3 w-3 text-muted transition-transform", open && "rotate-180")}
        >
          <path d="M4 6l4 4 4-4" />
        </svg>
      </button>

      {open ? (
        <div
          role="listbox"
          className="absolute top-full left-0 z-20 mt-1 w-72 overflow-hidden rounded border border-line bg-soft shadow-lg"
        >
          <div className="border-b border-line p-2">
            <input
              ref={searchInputRef}
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar país o prefijo"
              className="w-full rounded border border-line bg-card px-2.5 py-1.5 text-sm text-white placeholder:text-muted/80 focus:border-white focus:outline-none"
            />
          </div>
          <div className="max-h-60 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <p className="px-3 py-2 text-sm text-muted">Sin resultados.</p>
            ) : (
              filtered.map((country) => {
                const Flag = flags[country.value];
                const isSelected = country.value === value;
                return (
                  <button
                    key={country.value}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => select(country.value)}
                    className={cn(
                      "flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-white hover:bg-white/5",
                      isSelected && "bg-white/10",
                    )}
                  >
                    <span className="flex h-3.5 w-5 shrink-0 items-center justify-center overflow-hidden rounded-[2px]">
                      {Flag ? <Flag title={country.label} /> : null}
                    </span>
                    <span className="flex-1 truncate">{country.label}</span>
                    <span className="shrink-0 text-xs text-muted tabular-nums">+{getCountryCallingCode(country.value)}</span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
