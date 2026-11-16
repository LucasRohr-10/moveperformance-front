import type { ReceiptLinkDto } from "@/lib/api/types";

/**
 * Opens a receipt in a new tab. The tab is opened in the click itself (a tab opened after
 * an await is blocked by the browser) and then sent to the signed link, which is never kept.
 * Returns false when the tab could not be opened or the link could not be read.
 */
export async function openReceipt(getLink: () => Promise<ReceiptLinkDto>): Promise<boolean> {
  const tab = window.open("", "_blank");
  if (!tab) return false;
  tab.opener = null;
  try {
    const link = await getLink();
    tab.location.href = link.url;
    return true;
  } catch {
    tab.close();
    return false;
  }
}
