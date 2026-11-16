// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import { apiFetchClient } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";

import { getUnreadCount, listInbox, markInboxItemRead } from "./inbox-api";

vi.mock("@/lib/api/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/client")>()),
  apiFetchClient: vi.fn(),
}));

const apiFetchClientMock = vi.mocked(apiFetchClient);

describe("inbox API", () => {
  beforeEach(() => {
    apiFetchClientMock.mockReset();
  });

  it("getUnreadCount reads unreadCount", async () => {
    apiFetchClientMock.mockResolvedValue(Response.json({ unreadCount: 3 }));

    await expect(getUnreadCount()).resolves.toBe(3);
    expect(apiFetchClientMock).toHaveBeenCalledWith("/api/v1/me/inbox/unread-count");
  });

  it("listInbox returns the items and the unread count", async () => {
    const dto = { items: [], unreadCount: 0 };
    apiFetchClientMock.mockResolvedValue(Response.json(dto));

    await expect(listInbox()).resolves.toEqual(dto);
    expect(apiFetchClientMock).toHaveBeenCalledWith("/api/v1/me/inbox");
  });

  it("listInbox throws ApiError on 500", async () => {
    apiFetchClientMock.mockResolvedValue(
      Response.json({ statusCode: 500, code: "INTERNAL", message: "Error interno." }, { status: 500 }),
    );

    const failure = await listInbox().catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(ApiError);
    expect((failure as ApiError).body.code).toBe("INTERNAL");
  });

  it("markInboxItemRead posts to the encoded id and resolves on 204", async () => {
    apiFetchClientMock.mockResolvedValue(new Response(null, { status: 204 }));

    await expect(markInboxItemRead("notice:abc-1")).resolves.toBeUndefined();
    expect(apiFetchClientMock).toHaveBeenCalledWith("/api/v1/me/inbox/notice%3Aabc-1/read", {
      method: "POST",
    });
  });

  it("markInboxItemRead throws the API error when the item does not exist", async () => {
    apiFetchClientMock.mockResolvedValue(
      Response.json(
        { statusCode: 404, code: "INBOX_ITEM_NOT_FOUND", message: "El aviso no existe." },
        { status: 404 },
      ),
    );

    const failure = await markInboxItemRead("notice:x").catch((error: unknown) => error);

    expect((failure as ApiError).body.code).toBe("INBOX_ITEM_NOT_FOUND");
  });
});
