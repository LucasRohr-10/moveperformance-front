import { randomUUID } from "node:crypto";

import { expect, test } from "@playwright/test";

import type { ClientDetail, ClientPage, DeactivationPreview } from "@/lib/api/types";

import { OWNER_COOKIE, SCENARIO_COOKIE } from "./support/scenarios";

const API = `http://localhost:${Number(process.env.E2E_API_PORT ?? 4300)}/api/v1`;

// Each test is its own client, so what one changes never shows up in another running in parallel.
function as(scenario: string, owner: string = randomUUID()): { Cookie: string } {
  return { Cookie: `${SCENARIO_COOKIE}=${scenario}; ${OWNER_COOKIE}=${owner}` };
}

const ANA = "client-ana-gomez";
const DIEGO = "client-diego-baja";
const NEW_CLIENT = {
  name: "Bruno",
  lastName: "Nuevo",
  email: "Bruno@Move.test",
  phone: "+59899111222",
  birthDate: "1995-06-01",
  password: "Hd4@vNz8kTq3",
};

test.describe("fake API: staff clients", () => {
  test("lists the active clients by default and the deactivated ones with status", async ({ request }) => {
    const headers = as("staff-clients");

    const active: ClientPage = await (await request.get(`${API}/staff/clients`, { headers })).json();
    const deactivated: ClientPage = await (
      await request.get(`${API}/staff/clients?status=deactivated`, { headers })
    ).json();

    expect(active.items.map((client) => client.id)).toEqual([ANA, "client-carla-pendiente"]);
    expect(active.items.every((client) => client.deactivatedAt === null)).toBe(true);
    expect(deactivated.items).toHaveLength(1);
    expect(deactivated.items[0]).toMatchObject({ id: DIEGO, deactivatedAt: "2026-10-20T13:00:00.000Z" });
    expect(deactivated.total).toBe(1);

    const expiring: ClientPage = await (await request.get(`${API}/staff/clients?expiringSoon=true`, { headers })).json();
    expect(expiring.items.map((client) => client.id)).toEqual([ANA]);
  });

  test("searches by name and email, and paginates", async ({ request }) => {
    const headers = as("staff-clients");

    const byName: ClientPage = await (await request.get(`${API}/staff/clients?q=carla`, { headers })).json();
    const byEmail: ClientPage = await (
      await request.get(`${API}/staff/clients?q=PENDIENTE@move.test`, { headers })
    ).json();
    const secondPage: ClientPage = await (
      await request.get(`${API}/staff/clients?page=2&pageSize=1`, { headers })
    ).json();

    expect(byName.items.map((client) => client.id)).toEqual(["client-carla-pendiente"]);
    expect(byEmail.items.map((client) => client.id)).toEqual(["client-carla-pendiente"]);
    expect(secondPage).toMatchObject({ page: 2, pageSize: 1, total: 2 });
    expect(secondPage.items).toHaveLength(1);
  });

  test("answers 400 VALIDATION_FAILED for an invalid status", async ({ request }) => {
    const response = await request.get(`${API}/staff/clients?status=gone`, { headers: as("staff-clients") });

    expect(response.status()).toBe(400);
    expect(await response.json()).toMatchObject({ code: "VALIDATION_FAILED" });
  });

  test("reads a client with its deactivation, and answers 404 for an unknown one", async ({ request }) => {
    const headers = as("staff-clients");

    const diego: ClientDetail = await (await request.get(`${API}/staff/clients/${DIEGO}`, { headers })).json();
    const missing = await request.get(`${API}/staff/clients/nope`, { headers });
    const followup = await request.get(`${API}/staff/clients/${ANA}/followup`, { headers });

    expect(diego.deactivation).toEqual({
      deactivatedAt: "2026-10-20T13:00:00.000Z",
      deactivatedByName: "Valentina Velásquez",
      reason: "Se mudó",
    });
    expect(missing.status()).toBe(404);
    expect(await missing.json()).toMatchObject({ code: "CLIENT_NOT_FOUND" });
    expect(await followup.json()).toEqual({ pause: null, pauses: [], contacts: [] });
  });

  test("creates a client with a client- id and finds it afterwards", async ({ request }) => {
    const headers = as("staff-clients");

    const created = await request.post(`${API}/staff/clients`, { headers, data: NEW_CLIENT });
    expect(created.status()).toBe(201);
    const client: ClientDetail = await created.json();
    expect(client).toMatchObject({ name: "Bruno", email: "bruno@move.test", birthDate: "1995-06-01", deactivation: null });
    expect(client.id).toMatch(/^client-/);

    const found: ClientDetail = await (await request.get(`${API}/staff/clients/${client.id}`, { headers })).json();
    expect(found.id).toBe(client.id);
  });

  test("rejects an invalid new client with 400", async ({ request }) => {
    const headers = as("staff-clients");

    for (const data of [
      { ...NEW_CLIENT, name: "" },
      { ...NEW_CLIENT, password: "short" },
      { ...NEW_CLIENT, password: "x".repeat(129) },
      { ...NEW_CLIENT, phone: "099111222" },
      { ...NEW_CLIENT, birthDate: "01/06/1995" },
    ]) {
      const response = await request.post(`${API}/staff/clients`, { headers, data });
      expect(response.status()).toBe(400);
      expect(await response.json()).toMatchObject({ code: "VALIDATION_FAILED" });
    }
  });

  test("answers 409 for a taken and for an unconfirmed email", async ({ request }) => {
    const headers = as("staff-clients");

    const taken = await request.post(`${API}/staff/clients`, { headers, data: { ...NEW_CLIENT, email: "ana@move.test" } });
    const unconfirmed = await request.post(`${API}/staff/clients`, {
      headers,
      data: { ...NEW_CLIENT, email: "pendiente@move.test" },
    });

    expect(taken.status()).toBe(409);
    expect(await taken.json()).toMatchObject({ code: "CLIENT_EMAIL_TAKEN", message: "Ya hay una cuenta con ese email." });
    expect(unconfirmed.status()).toBe(409);
    expect(await unconfirmed.json()).toMatchObject({ code: "CLIENT_EMAIL_UNCONFIRMED" });
  });

  test("merges a PATCH and keeps the other fields", async ({ request }) => {
    const headers = as("staff-clients");

    const patched = await request.patch(`${API}/staff/clients/${ANA}`, { headers, data: { name: "Anita" } });
    expect(patched.status()).toBe(200);
    expect(await patched.json()).toMatchObject({ name: "Anita", lastName: "Gómez", email: "ana@move.test" });

    const read: ClientDetail = await (await request.get(`${API}/staff/clients/${ANA}`, { headers })).json();
    expect(read.name).toBe("Anita");
  });

  test("changes a password with 204 and no body, and rejects a short one", async ({ request }) => {
    const headers = as("staff-clients");

    const ok = await request.put(`${API}/staff/clients/${ANA}/password`, { headers, data: { password: "Hd4@vNz8kTq3" } });
    const short = await request.put(`${API}/staff/clients/${ANA}/password`, { headers, data: { password: "short" } });

    expect(ok.status()).toBe(204);
    expect(await ok.text()).toBe("");
    expect(short.status()).toBe(400);
  });

  test("previews what a deactivation cancels, and answers 409 for a deactivated client", async ({ request }) => {
    const headers = as("staff-clients");

    const preview: DeactivationPreview = await (
      await request.get(`${API}/staff/clients/${ANA}/deactivation-preview`, { headers })
    ).json();
    const already = await request.get(`${API}/staff/clients/${DIEGO}/deactivation-preview`, { headers });

    expect(preview).toEqual({ upcomingBookings: 2, hasCurrentPlan: true, autoDebits: 1, recoverySessionsLeft: 3 });
    expect(already.status()).toBe(409);
    expect(await already.json()).toMatchObject({ code: "CLIENT_ALREADY_DEACTIVATED" });
  });

  test("deactivates once with the reason and the author, then reactivates once", async ({ request }) => {
    const headers = as("staff-clients");

    const deactivated = await request.post(`${API}/staff/clients/${ANA}/deactivate`, { headers, data: { reason: "Se mudó" } });
    expect(deactivated.status()).toBe(200);
    expect((await deactivated.json()).deactivation).toMatchObject({ deactivatedByName: "Lucía Gómez", reason: "Se mudó" });

    const again = await request.post(`${API}/staff/clients/${ANA}/deactivate`, { headers, data: {} });
    expect(again.status()).toBe(409);
    expect(await again.json()).toMatchObject({ code: "CLIENT_ALREADY_DEACTIVATED" });
    const listed: ClientPage = await (await request.get(`${API}/staff/clients?status=deactivated`, { headers })).json();
    expect(listed.items.map((client) => client.id)).toContain(ANA);

    const reactivated = await request.post(`${API}/staff/clients/${ANA}/reactivate`, { headers, data: {} });
    expect(reactivated.status()).toBe(200);
    expect((await reactivated.json()).deactivation).toBeNull();

    const reactivatedAgain = await request.post(`${API}/staff/clients/${ANA}/reactivate`, { headers, data: {} });
    expect(reactivatedAgain.status()).toBe(409);
    expect(await reactivatedAgain.json()).toMatchObject({ code: "CLIENT_NOT_DEACTIVATED" });
  });

  test("answers 502 PAYMENT_PROVIDER_ERROR and keeps the client active when Mercado Pago is down", async ({ request }) => {
    const headers = as("staff-clients-provider-down");

    const response = await request.post(`${API}/staff/clients/${ANA}/deactivate`, { headers, data: {} });
    expect(response.status()).toBe(502);
    expect(await response.json()).toMatchObject({ code: "PAYMENT_PROVIDER_ERROR" });

    const read: ClientDetail = await (await request.get(`${API}/staff/clients/${ANA}`, { headers })).json();
    expect(read.deactivation).toBeNull();
  });

  test("keeps each owner's changes apart", async ({ request }) => {
    const first = as("staff-clients");
    const second = as("staff-clients");

    await request.post(`${API}/staff/clients/${ANA}/deactivate`, { headers: first, data: {} });

    const other: ClientDetail = await (await request.get(`${API}/staff/clients/${ANA}`, { headers: second })).json();
    expect(other.deactivation).toBeNull();
  });

  test("does not answer without a staff-clients scenario: plain staff falls through to the follow-up", async ({ request }) => {
    const headers = as("staff");

    const list = await request.get(`${API}/staff/clients`, { headers });
    const anaRecord = await request.get(`${API}/staff/clients/${ANA}`, { headers });
    const followupClient: ClientDetail = await (
      await request.get(`${API}/staff/clients/client-ana-perez`, { headers })
    ).json();

    expect(list.status()).toBe(404);
    expect(anaRecord.status()).toBe(404);
    expect(followupClient).toMatchObject({ id: "client-ana-perez", deactivation: null });
  });

  test("answers 403 ACCOUNT_DEACTIVATED on the session of a deactivated account", async ({ request }) => {
    const response = await request.get(`${API}/users/me`, { headers: as("account-deactivated") });

    expect(response.status()).toBe(403);
    expect(await response.json()).toMatchObject({ statusCode: 403, code: "ACCOUNT_DEACTIVATED" });
  });
});
