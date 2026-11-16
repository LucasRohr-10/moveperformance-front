import { randomUUID } from "node:crypto";

import { expect, test } from "@playwright/test";

import type { AlertCountsDto, AlertDto, ClientFollowupDto } from "@/lib/api/types";

import { E2E_ALERTS } from "./support/followup-fixtures";
import { OWNER_COOKIE, SCENARIO_COOKIE } from "./support/scenarios";

const API = `http://localhost:${Number(process.env.E2E_API_PORT ?? 4300)}/api/v1`;

// Each test is its own client, so what one changes never shows up in another running in parallel.
function as(scenario: string, owner: string = randomUUID()): { Cookie: string } {
  return { Cookie: `${SCENARIO_COOKIE}=${scenario}; ${OWNER_COOKIE}=${owner}` };
}

const LUCIA = "client-lucia-fernandez";
const CHECKIN_ID = "c-2026-10";
const ANSWERS = { feeling: "good", pain: "none", goals: "same" };

test.describe("fake API: staff follow-up and monthly check-in", () => {
  test("signs in staff for staff scenarios and the client otherwise", async ({ request }) => {
    const staff = await (await request.get(`${API}/users/me`, { headers: as("staff") })).json();
    const empty = await (await request.get(`${API}/users/me`, { headers: as("staff-empty") })).json();
    const client = await (await request.get(`${API}/users/me`, { headers: as("none") })).json();

    expect(staff).toMatchObject({ id: "staff-e2e", role: "staff" });
    expect(empty).toMatchObject({ role: "staff" });
    expect(client).toMatchObject({ id: "e2e-client-ana", role: "client" });
  });

  test("counts every alert type and the total", async ({ request }) => {
    const counts: AlertCountsDto = await (
      await request.get(`${API}/staff/alerts/counts`, { headers: as("staff") })
    ).json();

    expect(counts.total).toBe(E2E_ALERTS.length);
    expect(counts).toMatchObject({ expiring: 1, expired: 1, no_attendance: 1, recontact: 1, checkin_pain: 1 });
  });

  test("filters the list by type and returns nothing in the empty scenario", async ({ request }) => {
    const headers = as("staff");
    const expiring: AlertDto[] = await (await request.get(`${API}/staff/alerts?type=expiring`, { headers })).json();
    const empty: AlertDto[] = await (await request.get(`${API}/staff/alerts`, { headers: as("staff-empty") })).json();

    expect(expiring.map((alert) => alert.id)).toEqual(["alert-expiring"]);
    expect(empty).toEqual([]);
  });

  test("filters the list to the risk alerts with group=risk", async ({ request }) => {
    const headers = as("staff");
    const risk: AlertDto[] = await (await request.get(`${API}/staff/alerts?group=risk`, { headers })).json();

    expect(risk.map((alert) => alert.id).sort()).toEqual([
      "alert-checkin-pain",
      "alert-expired",
      "alert-frequency-drop",
      "alert-no-attendance",
      "alert-prolonged-inactivity",
    ]);
    expect((await request.get(`${API}/staff/alerts?group=other`, { headers })).status()).toBe(400);
  });

  test("keeps the list working when the counters are down", async ({ request }) => {
    const headers = as("staff-error");

    expect((await request.get(`${API}/staff/alerts/counts`, { headers })).status()).toBe(500);
    expect((await request.get(`${API}/staff/alerts`, { headers })).status()).toBe(200);
  });

  test("handles an alert once and answers ALERT_ALREADY_HANDLED after", async ({ request }) => {
    const headers = as("staff");

    const first = await request.post(`${API}/staff/alerts/alert-expired/handle`, { headers });
    expect(first.status()).toBe(200);
    expect(await first.json()).toMatchObject({ id: "alert-expired", status: "handled" });

    const second = await request.post(`${API}/staff/alerts/alert-expired/handle`, { headers });
    expect(second.status()).toBe(409);
    expect(await second.json()).toMatchObject({ code: "ALERT_ALREADY_HANDLED" });

    const open: AlertDto[] = await (await request.get(`${API}/staff/alerts`, { headers })).json();
    expect(open.some((alert) => alert.id === "alert-expired")).toBe(false);
  });

  test("records a contact without closing the alert", async ({ request }) => {
    const headers = as("staff");

    const response = await request.post(`${API}/staff/clients/client-ana-perez/contact`, {
      headers,
      data: { channel: "whatsapp", outcome: "reached", note: "Renueva el lunes", alertId: "alert-expiring" },
    });
    expect(response.status()).toBe(201);
    expect(await response.json()).toMatchObject({ channel: "whatsapp", alertType: "expiring" });

    const followup: ClientFollowupDto = await (
      await request.get(`${API}/staff/clients/client-ana-perez/followup`, { headers })
    ).json();
    expect(followup.contacts).toHaveLength(1);
    const open: AlertDto[] = await (await request.get(`${API}/staff/alerts?type=expiring`, { headers })).json();
    expect(open[0]).toMatchObject({ status: "open", contactsCount: 1 });
  });

  test("hands in the open alerts of a client as handled when a pause starts", async ({ request }) => {
    const headers = as("staff");

    const started = await request.post(`${API}/staff/clients/client-ana-perez/inactivity-reasons`, {
      headers,
      data: { reason: "vacation" },
    });
    expect(started.status()).toBe(201);

    const open: AlertDto[] = await (await request.get(`${API}/staff/alerts`, { headers })).json();
    expect(open.some((alert) => alert.client.id === "client-ana-perez")).toBe(false);
    expect(open).toHaveLength(E2E_ALERTS.length - 1);
  });

  test("answers PAUSE_ALREADY_ACTIVE for a client with a pause and lets it end once", async ({ request }) => {
    const headers = as("staff");

    const again = await request.post(`${API}/staff/clients/${LUCIA}/inactivity-reasons`, {
      headers,
      data: { reason: "vacation" },
    });
    expect(again.status()).toBe(409);
    expect(await again.json()).toMatchObject({ code: "PAUSE_ALREADY_ACTIVE" });

    const ended = await request.post(`${API}/staff/clients/${LUCIA}/inactivity-reasons/end`, { headers });
    expect(ended.status()).toBe(200);
    const endedAgain = await request.post(`${API}/staff/clients/${LUCIA}/inactivity-reasons/end`, { headers });
    expect(endedAgain.status()).toBe(409);
    expect(await endedAgain.json()).toMatchObject({ code: "NO_ACTIVE_PAUSE" });

    const followup: ClientFollowupDto = await (
      await request.get(`${API}/staff/clients/${LUCIA}/followup`, { headers })
    ).json();
    expect(followup.pause).toBeNull();
    expect(followup.pauses).toHaveLength(1);
  });

  test("answers a pending check-in once", async ({ request }) => {
    const headers = as("checkin-pending");

    const pending = await (await request.get(`${API}/me/checkins/pending`, { headers })).json();
    expect(pending).toEqual({ checkin: { id: CHECKIN_ID, period: "2026-10", firstName: "Ana" } });

    const first = await request.post(`${API}/me/checkins/${CHECKIN_ID}`, { headers, data: ANSWERS });
    expect(first.status()).toBe(200);
    expect(await first.json()).toEqual({ flag: "ok" });

    const second = await request.post(`${API}/me/checkins/${CHECKIN_ID}`, { headers, data: ANSWERS });
    expect(second.status()).toBe(409);
    expect(await second.json()).toMatchObject({ code: "CHECKIN_ALREADY_ANSWERED" });
    expect(await (await request.get(`${API}/me/checkins/pending`, { headers })).json()).toEqual({ checkin: null });
  });

  test("has no pending check-in outside the checkin-pending scenario", async ({ request }) => {
    const pending = await (await request.get(`${API}/me/checkins/pending`, { headers: as("none") })).json();

    expect(pending).toEqual({ checkin: null });
  });
});
