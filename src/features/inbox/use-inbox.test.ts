import { act, renderHook, screen } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SnackbarProvider } from "@/components/ui/snackbar";
import { ApiError } from "@/lib/api/errors";
import type { InboxItemDto } from "@/lib/api/types";

import { getUnreadCount, listInbox, markInboxItemRead } from "./inbox-api";
import { useInbox } from "./use-inbox";

const push = vi.fn();

vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("./inbox-api");

const getUnreadCountMock = vi.mocked(getUnreadCount);
const listInboxMock = vi.mocked(listInbox);
const markInboxItemReadMock = vi.mocked(markInboxItemRead);

let hidden = false;

function item(overrides: Partial<InboxItemDto> = {}): InboxItemDto {
  return {
    id: "notice:1",
    source: "notice",
    type: "booking_cancelled_by_staff",
    title: "MOVE canceló tu turno",
    body: "Recovery · Miércoles 12 de noviembre · 09:00 a 09:45.",
    createdAt: "2026-10-27T13:00:00.000Z",
    readAt: null,
    action: { label: "Reservar otro turno", href: "/bookings?service=recovery" },
    ...overrides,
  };
}

function wrapper({ children }: { children: ReactNode }) {
  return createElement(SnackbarProvider, null, children);
}

async function renderInbox() {
  const rendered = renderHook(() => useInbox(), { wrapper });
  await act(async () => {});
  return rendered;
}

async function advance(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

async function becomeVisible() {
  await act(async () => {
    document.dispatchEvent(new Event("visibilitychange"));
  });
}

describe("useInbox", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    hidden = false;
    Object.defineProperty(document, "hidden", { configurable: true, get: () => hidden });
    push.mockReset();
    getUnreadCountMock.mockReset().mockResolvedValue(3);
    listInboxMock.mockReset();
    markInboxItemReadMock.mockReset().mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("reads the unread count on mount", async () => {
    const { result } = await renderInbox();

    expect(getUnreadCountMock).toHaveBeenCalledTimes(1);
    expect(result.current.unreadCount).toBe(3);
    expect(result.current.list).toBe("idle");
  });

  it("does not ask for the count again as time passes", async () => {
    await renderInbox();

    await advance(10 * 60_000);

    expect(getUnreadCountMock).toHaveBeenCalledTimes(1);
  });

  it("refreshes the count when the tab becomes visible and not while hidden", async () => {
    const { result } = await renderInbox();
    hidden = true;
    getUnreadCountMock.mockResolvedValue(7);

    await becomeVisible();
    expect(getUnreadCountMock).toHaveBeenCalledTimes(1);

    hidden = false;
    await becomeVisible();

    expect(getUnreadCountMock).toHaveBeenCalledTimes(2);
    expect(result.current.unreadCount).toBe(7);
  });

  it("keeps the last count when the count cannot be read", async () => {
    const { result } = await renderInbox();
    getUnreadCountMock.mockRejectedValue(new Error("offline"));

    await becomeVisible();

    expect(result.current.unreadCount).toBe(3);
  });

  it("stops listening for visibility changes when it unmounts", async () => {
    const { unmount } = await renderInbox();
    unmount();

    await becomeVisible();

    expect(getUnreadCountMock).toHaveBeenCalledTimes(1);
  });

  it("loadList sets loading then items and updates the count", async () => {
    let finish: (value: { items: InboxItemDto[]; unreadCount: number }) => void = () => {};
    listInboxMock.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    const { result } = await renderInbox();

    let loading: Promise<void> = Promise.resolve();
    act(() => {
      loading = result.current.loadList();
    });
    expect(result.current.list).toBe("loading");

    await act(async () => {
      finish({ items: [item()], unreadCount: 1 });
      await loading;
    });

    expect(result.current.list).toEqual({ items: [item()] });
    expect(result.current.unreadCount).toBe(1);
  });

  it("loadList failure sets error, and a later failure keeps shown items", async () => {
    listInboxMock.mockRejectedValueOnce(new Error("boom"));
    const { result } = await renderInbox();

    await act(async () => {
      await result.current.loadList();
    });
    expect(result.current.list).toBe("error");

    listInboxMock.mockResolvedValueOnce({ items: [item()], unreadCount: 1 });
    await act(async () => {
      await result.current.loadList();
    });
    listInboxMock.mockRejectedValueOnce(new Error("boom"));
    await act(async () => {
      await result.current.loadList();
    });

    expect(result.current.list).toEqual({ items: [item()] });
  });

  async function renderLoaded(items: InboxItemDto[], unreadCount: number) {
    listInboxMock.mockResolvedValue({ items, unreadCount });
    const rendered = await renderInbox();
    await act(async () => {
      await rendered.result.current.loadList();
    });
    return rendered;
  }

  it("markRead sets readAt and lowers the count before the request resolves", async () => {
    let finish: () => void = () => {};
    markInboxItemReadMock.mockReturnValue(new Promise<void>((resolve) => (finish = resolve)));
    const { result } = await renderLoaded([item()], 1);

    let marking: Promise<void> = Promise.resolve();
    act(() => {
      marking = result.current.markRead("notice:1");
    });

    expect(result.current.unreadCount).toBe(0);
    expect(result.current.list).toMatchObject({ items: [{ id: "notice:1", readAt: expect.any(String) }] });

    await act(async () => {
      finish();
      await marking;
    });
    expect(markInboxItemReadMock).toHaveBeenCalledWith("notice:1");
  });

  it("markRead failure restores the item and the count and shows the snackbar", async () => {
    markInboxItemReadMock.mockRejectedValue(
      new ApiError({ statusCode: 500, code: "INTERNAL", message: "detalle interno" }),
    );
    const { result } = await renderLoaded([item()], 1);

    await act(async () => {
      await result.current.markRead("notice:1");
    });

    expect(result.current.unreadCount).toBe(1);
    expect(result.current.list).toEqual({ items: [item()] });
    expect(screen.getByRole("alert").textContent).toContain("No pudimos marcar el aviso como leído.");
  });

  it("markRead twice sends one request and lowers the count once", async () => {
    let finish: () => void = () => {};
    markInboxItemReadMock.mockReturnValue(new Promise<void>((resolve) => (finish = resolve)));
    const { result } = await renderLoaded([item(), item({ id: "notice:2" })], 2);

    let first: Promise<void> = Promise.resolve();
    let second: Promise<void> = Promise.resolve();
    act(() => {
      first = result.current.markRead("notice:1");
      second = result.current.markRead("notice:1");
    });

    await act(async () => {
      finish();
      await Promise.all([first, second]);
    });

    expect(markInboxItemReadMock).toHaveBeenCalledTimes(1);
    expect(result.current.unreadCount).toBe(1);
  });

  it("markRead does nothing for an item that is already read", async () => {
    const { result } = await renderLoaded([item({ readAt: "2026-10-27T14:00:00.000Z" })], 0);

    await act(async () => {
      await result.current.markRead("notice:1");
    });

    expect(markInboxItemReadMock).not.toHaveBeenCalled();
    expect(result.current.unreadCount).toBe(0);
  });

  it("a count refresh that was in flight does not undo a markRead", async () => {
    const { result } = await renderLoaded([item()], 1);
    let finishCount: (value: number) => void = () => {};
    getUnreadCountMock.mockReturnValue(new Promise((resolve) => (finishCount = resolve)));

    await becomeVisible();
    await act(async () => {
      await result.current.markRead("notice:1");
    });
    await act(async () => {
      finishCount(1);
    });

    expect(result.current.unreadCount).toBe(0);
  });

  it("openAction marks unread items and navigates to the action href", async () => {
    const { result } = await renderLoaded([item()], 1);

    await act(async () => {
      result.current.openAction(item());
    });

    expect(markInboxItemReadMock).toHaveBeenCalledWith("notice:1");
    expect(push).toHaveBeenCalledWith("/bookings?service=recovery");
  });

  it("openAction does not mark an item that is already read", async () => {
    const read = item({ readAt: "2026-10-27T14:00:00.000Z" });
    const { result } = await renderLoaded([read], 0);

    await act(async () => {
      result.current.openAction(read);
    });

    expect(markInboxItemReadMock).not.toHaveBeenCalled();
    expect(push).toHaveBeenCalledWith("/bookings?service=recovery");
  });
});
