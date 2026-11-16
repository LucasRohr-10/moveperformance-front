// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api/errors";
import type { DayDraftDto, DayImpactDto } from "@/lib/api/types";

import { applyDay, getDayEditor, previewDay } from "./day-editor-api";

function stubFetch(response: Response) {
  const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(response);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

const draft: DayDraftDto = {
  from: "2026-11-12",
  reason: "Mantenimiento de la sala",
  bands: [{ templateId: "t1", isOpen: false }],
  slotEdits: [],
  cancelSlotIds: [],
  reopenSlotIds: [],
  addSlots: [],
  removeSlotIds: [],
};

const impact: DayImpactDto = {
  cancelledSlots: 3,
  createdSlots: 0,
  modifiedSlots: 0,
  affectedBookings: { total: 5, package: 2, planOrFollowup: 1, payment: 2 },
};

describe("day editor API", () => {
  it("asks for a single day with only `from`", async () => {
    const fetchMock = stubFetch(Response.json({}));

    await getDayEditor("2026-11-12");

    expect(fetchMock).toHaveBeenCalledWith("http://api.test/api/v1/staff/days?from=2026-11-12", {
      credentials: "include",
    });
  });

  it("asks for a range with `from` and `to`", async () => {
    const fetchMock = stubFetch(Response.json({}));

    await getDayEditor("2026-11-12", "2026-11-15");

    const [url] = fetchMock.mock.calls[0];
    const params = new URL(url as string).searchParams;
    expect(params.get("from")).toBe("2026-11-12");
    expect(params.get("to")).toBe("2026-11-15");
  });

  it("applyDay posts the draft with expectedAffectedBookings and parses the impact", async () => {
    const fetchMock = stubFetch(Response.json(impact));

    const result = await applyDay(draft, 5);

    expect(result).toEqual(impact);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://api.test/api/v1/staff/days/apply");
    expect(init?.method).toBe("POST");
    expect(JSON.parse(init?.body as string)).toEqual({ ...draft, expectedAffectedBookings: 5 });
  });

  it("previewDay posts the draft as is", async () => {
    const fetchMock = stubFetch(Response.json(impact));

    await previewDay(draft);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://api.test/api/v1/staff/days/preview");
    expect(JSON.parse(init?.body as string)).toEqual(draft);
  });

  it("previewDay throws ApiError with the backend code", async () => {
    stubFetch(
      Response.json(
        { statusCode: 409, code: "DAY_EDIT_ATTENDANCE_MARKED", message: "Hay asistencia marcada" },
        { status: 409 },
      ),
    );

    const error = await previewDay(draft).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).body.code).toBe("DAY_EDIT_ATTENDANCE_MARKED");
  });
});
