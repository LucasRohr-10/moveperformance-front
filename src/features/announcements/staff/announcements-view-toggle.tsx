import { cn } from "@/lib/cn";

export type AnnouncementsView = "active" | "expired";

export interface AnnouncementsViewToggleProps {
  view: AnnouncementsView;
  activeCount: number;
  expiredCount: number;
  onChange(view: AnnouncementsView): void;
}

// The same chips as the alert filters of the follow-up screen: one list at a time.
export function AnnouncementsViewToggle({ view, activeCount, expiredCount, onChange }: AnnouncementsViewToggleProps) {
  const chips: { view: AnnouncementsView; text: string }[] = [
    { view: "active", text: `Activos · ${activeCount}` },
    { view: "expired", text: `Vencidos · ${expiredCount}` },
  ];

  return (
    <div role="group" aria-label="Ver comunicados" className="flex flex-wrap gap-2">
      {chips.map((chip) => (
        <button
          key={chip.view}
          type="button"
          aria-pressed={chip.view === view}
          onClick={() => onChange(chip.view)}
          className={cn(
            "min-h-11 rounded border px-3 text-xs font-medium transition-colors sm:min-h-0 sm:py-1.5",
            chip.view === view ? "border-white bg-white text-black" : "border-line text-muted hover:text-white",
          )}
        >
          {chip.text}
        </button>
      ))}
    </div>
  );
}
