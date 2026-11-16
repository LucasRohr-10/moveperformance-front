import { describe, expect, it, vi } from "vitest";
import { apiFetchClient } from "./client";

describe("apiFetchClient", () => {
  it("fetches the full API URL with credentials included", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}"));

    await apiFetchClient("/api/v1/schedule/availability?service=performance&from=2026-10-12&days=1");

    expect(fetchMock).toHaveBeenCalledWith(
      "http://api.test/api/v1/schedule/availability?service=performance&from=2026-10-12&days=1",
      expect.objectContaining({ credentials: "include" }),
    );
  });
});
