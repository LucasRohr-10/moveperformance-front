// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import { apiFetchClient } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import type { AnnouncementDto } from "@/lib/api/types";

import {
  deleteAnnouncement,
  editAnnouncement,
  listStaffAnnouncements,
  publishAnnouncement,
} from "./staff-announcements-api";

vi.mock("@/lib/api/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/client")>()),
  apiFetchClient: vi.fn(),
}));

const apiFetchClientMock = vi.mocked(apiFetchClient);

const ANNOUNCEMENT: AnnouncementDto = {
  id: "a-1",
  body: "Feriado",
  visibleUntil: "2026-11-03",
  createdAt: "2026-10-27T12:00:00.000Z",
  createdByName: "Valentina",
  updatedAt: "2026-10-27T12:00:00.000Z",
  updatedByName: null,
};

describe("staff announcements API", () => {
  beforeEach(() => {
    apiFetchClientMock.mockReset();
  });

  it("listStaffAnnouncements reads the active and expired lists", async () => {
    apiFetchClientMock.mockResolvedValue(Response.json({ active: [ANNOUNCEMENT], expired: [] }));

    await expect(listStaffAnnouncements()).resolves.toEqual({ active: [ANNOUNCEMENT], expired: [] });
    expect(apiFetchClientMock).toHaveBeenCalledWith("/api/v1/staff/announcements");
  });

  it("publishAnnouncement posts the message and the date", async () => {
    apiFetchClientMock.mockResolvedValue(Response.json(ANNOUNCEMENT, { status: 201 }));

    await expect(publishAnnouncement({ body: "Feriado", visibleUntil: "2026-11-03" })).resolves.toEqual(
      ANNOUNCEMENT,
    );
    expect(apiFetchClientMock).toHaveBeenCalledWith("/api/v1/staff/announcements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: "Feriado", visibleUntil: "2026-11-03" }),
    });
  });

  it("editAnnouncement sends PATCH with only the given fields", async () => {
    apiFetchClientMock.mockResolvedValue(Response.json(ANNOUNCEMENT));

    await editAnnouncement("a-1", { body: "Nuevo" });

    expect(apiFetchClientMock).toHaveBeenCalledWith("/api/v1/staff/announcements/a-1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: "Nuevo" }),
    });
  });

  it("deleteAnnouncement sends DELETE to the announcement", async () => {
    apiFetchClientMock.mockResolvedValue(new Response(null, { status: 204 }));

    await expect(deleteAnnouncement("a-1")).resolves.toBeUndefined();

    expect(apiFetchClientMock).toHaveBeenCalledWith("/api/v1/staff/announcements/a-1", { method: "DELETE" });
  });

  it("deleteAnnouncement throws the API error when the announcement is gone", async () => {
    apiFetchClientMock.mockResolvedValue(
      Response.json(
        { statusCode: 404, code: "ANNOUNCEMENT_NOT_FOUND", message: "No encontramos el comunicado." },
        { status: 404 },
      ),
    );

    await expect(deleteAnnouncement("a-1")).rejects.toBeInstanceOf(ApiError);
  });
});
