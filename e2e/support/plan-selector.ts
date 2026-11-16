import type { Locator, Page } from "@playwright/test";

/** Picks a plan in its card on /plans: a person clicks the plan's row, whose radio is visually hidden. */
export async function selectPlan(page: Page, planName: string): Promise<void> {
  const row = page.locator("label").filter({ has: page.getByText(planName, { exact: true }) });
  await row.filter({ visible: true }).click();
}

/** The action of a card names the plan that is selected, like "Contratar · $ 10.500". */
export function planAction(page: Page, label: string): Locator {
  const prefix = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return page.getByRole("link", { name: new RegExp(`^${prefix} · `) }).filter({ visible: true });
}
