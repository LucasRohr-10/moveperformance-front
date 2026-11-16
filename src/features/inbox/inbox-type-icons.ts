export type InboxIconTone = "warning" | "danger" | "success" | "info";
export type InboxIconGlyph = "!" | "✓" | "i";

export interface InboxIcon {
  tone: InboxIconTone;
  glyph: InboxIconGlyph;
}

// A staff cancellation carries a "!" and not a cross, so it reads as "pay attention" and not as an error.
// Adding a kind of notice is adding an entry here.
const INBOX_TYPE_ICONS: Record<string, InboxIcon> = {
  booking_cancelled_by_staff: { tone: "warning", glyph: "!" },
  booking_hold_expired: { tone: "warning", glyph: "!" },
  auto_debit_cancelled: { tone: "warning", glyph: "!" },
  payment_declined: { tone: "danger", glyph: "!" },
  payment_approved_later: { tone: "success", glyph: "✓" },
  auto_debit_charged: { tone: "success", glyph: "✓" },
  announcement: { tone: "info", glyph: "i" },
};

const FALLBACK_ICON: InboxIcon = { tone: "info", glyph: "i" };

export function inboxIconFor(type: string): InboxIcon {
  return INBOX_TYPE_ICONS[type] ?? FALLBACK_ICON;
}
