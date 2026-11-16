// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

import { listStaffPayments } from "./staff-payments-api";

function stubFetch(response: Response) {
  const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(response);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

const emptyPage = { items: [], total: 0, page: 1, pageSize: 20 };

describe("staff payments API", () => {
  it("lists payments with just the page when there is no filter", async () => {
    const fetchMock = stubFetch(Response.json(emptyPage));

    await listStaffPayments({}, 1);

    expect(fetchMock).toHaveBeenCalledWith("http://api.test/api/v1/staff/payments?page=1", {
      credentials: "include",
    });
  });

  it("sends every filter as a query param", async () => {
    const fetchMock = stubFetch(Response.json(emptyPage));

    await listStaffPayments(
      { status: "pending", kind: "plan", origin: "auto_debit", needsAttention: true },
      2,
    );

    const [url] = fetchMock.mock.calls[0];
    const params = new URL(url as string).searchParams;
    expect(params.get("page")).toBe("2");
    expect(params.get("status")).toBe("pending");
    expect(params.get("kind")).toBe("plan");
    expect(params.get("origin")).toBe("auto_debit");
    expect(params.get("needsAttention")).toBe("true");
  });

  it("omits needsAttention when false", async () => {
    const fetchMock = stubFetch(Response.json(emptyPage));

    await listStaffPayments({ needsAttention: false }, 1);

    const [url] = fetchMock.mock.calls[0];
    expect(new URL(url as string).searchParams.has("needsAttention")).toBe(false);
  });

  it("asks for a page size only when given one", async () => {
    const fetchMock = stubFetch(Response.json(emptyPage));

    await listStaffPayments({ needsAttention: true }, 1, 1);

    const [url] = fetchMock.mock.calls[0];
    const params = new URL(url as string).searchParams;
    expect(params.get("pageSize")).toBe("1");
    expect(params.get("needsAttention")).toBe("true");
  });
});
