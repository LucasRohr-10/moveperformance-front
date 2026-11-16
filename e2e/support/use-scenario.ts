import type { BrowserContext } from "@playwright/test";

import {
  OWNER_COOKIE,
  SCENARIO_COOKIE,
  type ScenarioName,
  type SpecialScenario,
} from "./scenarios";

async function setCookie(context: BrowserContext, baseURL: string, name: string, value: string): Promise<void> {
  await context.addCookies([{ name, value, domain: new URL(baseURL).hostname, path: "/" }]);
}

// Not named `use…` so that helpers (which are not React hooks) can call it.
export function setScenario(
  context: BrowserContext,
  baseURL: string,
  scenario: ScenarioName | SpecialScenario,
): Promise<void> {
  return setCookie(context, baseURL, SCENARIO_COOKIE, scenario);
}

// Makes this test its own client for the debits, which the fake API keeps per client.
export function setOwner(context: BrowserContext, baseURL: string, owner: string): Promise<void> {
  return setCookie(context, baseURL, OWNER_COOKIE, owner);
}

export function useScenario(
  context: BrowserContext,
  baseURL: string,
  scenario: ScenarioName | SpecialScenario,
): Promise<void> {
  return setScenario(context, baseURL, scenario);
}
