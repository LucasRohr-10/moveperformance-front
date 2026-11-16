export type NoteIcon = "check" | "cross" | "clock" | "spinner" | "calendar-x" | "undo";
export type NoteTone = "success" | "warning" | "danger" | "info" | "neutral";

export interface PaymentNoteModel {
  tone: NoteTone;
  icon: NoteIcon;
  title: string;
  body: string | null;
}

export interface PaymentRowModel {
  label: string;
  value: string;
}

// What changes from one state to the next: the badge, the note and the detail rows.
export interface StatePresentation {
  badge: { label: string; tone: NoteTone };
  note: PaymentNoteModel;
  rows: PaymentRowModel[];
}

// Everything a card draws, already in words: the component only lays it out.
export interface PaymentCardModel extends StatePresentation {
  id: string;
  title: string;
  subtitle: string;
  amount: string;
  isAmountMuted: boolean;
  icon: "card" | "repeat";
  // Set only when the payment was recorded outside the app and has a receipt to open.
  receiptPurchaseId: string | null;
}
