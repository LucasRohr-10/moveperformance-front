"use client";

import { useSnackbar } from "@/components/ui/snackbar";
// By path: the staff payments feature's index also exports its client panel.
import { openReceipt } from "@/features/payments/staff/open-receipt";

import { getMyReceiptLink } from "./get-my-receipt-link";

const RECEIPT_FAILED_MESSAGE = "No pudimos abrir el comprobante. Probá de nuevo.";

export function ReceiptButton({ purchaseId }: { purchaseId: string }) {
  const { showSnackbar } = useSnackbar();

  async function viewReceipt(): Promise<void> {
    const opened = await openReceipt(() => getMyReceiptLink(purchaseId));
    if (!opened) showSnackbar({ tone: "danger", title: RECEIPT_FAILED_MESSAGE });
  }

  return (
    <button
      type="button"
      onClick={viewReceipt}
      className="mt-3 min-h-11 text-xs underline underline-offset-2 hover:no-underline sm:min-h-0"
    >
      Ver comprobante
    </button>
  );
}
