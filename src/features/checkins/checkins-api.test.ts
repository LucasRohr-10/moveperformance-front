// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import { apiFetchClient } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";

import { answerCheckin } from "./checkins-api";

vi.mock("@/lib/api/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/client")>()),
  apiFetchClient: vi.fn(),
}));

const apiFetchClientMock = vi.mocked(apiFetchClient);

describe("answerCheckin", () => {
  beforeEach(() => {
    apiFetchClientMock.mockReset();
  });

  it("sends the answers of the check-in", async () => {
    const answers = { feeling: "good", pain: "mild", painDetail: "Rodilla", goals: "same" } as const;
    apiFetchClientMock.mockResolvedValue(Response.json({ flag: "pain" }));

    await expect(answerCheckin("c-1", answers)).resolves.toEqual({ flag: "pain" });
    expect(apiFetchClientMock).toHaveBeenCalledWith("/api/v1/me/checkins/c-1", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(answers),
    });
  });

  it("throws the API error when the check-in was already answered", async () => {
    apiFetchClientMock.mockResolvedValue(
      Response.json(
        { statusCode: 409, code: "CHECKIN_ALREADY_ANSWERED", message: "Este check-in ya fue respondido." },
        { status: 409 },
      ),
    );

    const failure = await answerCheckin("c-1", { feeling: "good", pain: "none", goals: "same" }).catch(
      (error: unknown) => error,
    );

    expect(failure).toBeInstanceOf(ApiError);
    expect((failure as ApiError).body.code).toBe("CHECKIN_ALREADY_ANSWERED");
  });
});
