// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api/errors";

import { createPlan, deletePlan, listStaffPlans, updatePlan, type PlanInput } from "./staff-plans-api";

function stubFetch(response: Response) {
  const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(response);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

const input: PlanInput = {
  service: "recovery",
  kind: "session_pack",
  slug: "paquete-4",
  name: "Paquete 4",
  description: "",
  features: [],
  price: 3200,
  periodDays: 30,
  sessionsIncluded: 4,
  featured: false,
  sortOrder: 0,
  isActive: true,
};

describe("staff plans API", () => {
  it("lists the plans with the session cookie", async () => {
    const fetchMock = stubFetch(Response.json([]));

    await expect(listStaffPlans()).resolves.toEqual([]);

    expect(fetchMock).toHaveBeenCalledWith("http://api.test/api/v1/staff/plans", { credentials: "include" });
  });

  it("createPlan POSTs the plan as JSON with credentials", async () => {
    const fetchMock = stubFetch(Response.json({ id: "1" }, { status: 201 }));

    await createPlan(input);

    expect(fetchMock).toHaveBeenCalledWith("http://api.test/api/v1/staff/plans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
      credentials: "include",
    });
  });

  it("updatePlan PATCHes only the patch to the plan's URL", async () => {
    const fetchMock = stubFetch(Response.json({ id: "abc" }));

    await updatePlan("abc", { isActive: false });

    expect(fetchMock).toHaveBeenCalledWith("http://api.test/api/v1/staff/plans/abc", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: false }),
      credentials: "include",
    });
  });

  it("deletePlan resolves on 204", async () => {
    const fetchMock = stubFetch(new Response(null, { status: 204 }));

    await expect(deletePlan("abc")).resolves.toBeUndefined();

    expect(fetchMock).toHaveBeenCalledWith("http://api.test/api/v1/staff/plans/abc", {
      method: "DELETE",
      credentials: "include",
    });
  });

  it("deletePlan rejects with the ApiError of a 404", async () => {
    stubFetch(
      Response.json(
        { statusCode: 404, code: "PLAN_NOT_FOUND", message: "El plan no existe." },
        { status: 404 },
      ),
    );

    const error = await deletePlan("abc").catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).body.code).toBe("PLAN_NOT_FOUND");
  });
});
