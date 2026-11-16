import type { APIRequestContext } from "@playwright/test";

import type { SimulateOutcome } from "@/lib/api/types";

import { SCENARIO_COOKIE } from "./scenarios";

const API_PORT = Number(process.env.E2E_API_PORT ?? 4300);

export async function simulateFromTest(
  request: APIRequestContext,
  externalReference: string,
  outcome: SimulateOutcome,
): Promise<void> {
  const response = await request.post(
    `http://localhost:${API_PORT}/api/v1/payments/dev/simulate`,
    {
      headers: { Cookie: `${SCENARIO_COOKIE}=none` },
      data: { externalReference, outcome },
    },
  );
  if (!response.ok()) {
    throw new Error(`simulate failed with status ${response.status()}`);
  }
}
