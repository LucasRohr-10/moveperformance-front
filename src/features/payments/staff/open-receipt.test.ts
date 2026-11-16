import { afterEach, describe, expect, it, vi } from "vitest";

import { openReceipt } from "./open-receipt";

const LINK = { url: "https://files.test/r?sig=1", expiresAt: "2026-11-02T13:00:00.000Z" };

function fakeTab() {
  return { opener: {} as unknown, location: { href: "" }, close: vi.fn() };
}

afterEach(() => vi.restoreAllMocks());

describe("openReceipt", () => {
  it("opens the tab before asking and then navigates it", async () => {
    const tab = fakeTab();
    const open = vi.spyOn(window, "open").mockReturnValue(tab as unknown as Window);
    const order: string[] = [];
    open.mockImplementation(() => {
      order.push("open");
      return tab as unknown as Window;
    });
    const getLink = vi.fn(async () => {
      order.push("link");
      return LINK;
    });

    await expect(openReceipt(getLink)).resolves.toBe(true);

    expect(order).toEqual(["open", "link"]);
    expect(open).toHaveBeenCalledWith("", "_blank");
    expect(tab.opener).toBeNull();
    expect(tab.location.href).toBe(LINK.url);
    expect(tab.close).not.toHaveBeenCalled();
  });

  it("closes the tab and returns false when the link fails", async () => {
    const tab = fakeTab();
    vi.spyOn(window, "open").mockReturnValue(tab as unknown as Window);

    await expect(openReceipt(() => Promise.reject(new Error("boom")))).resolves.toBe(false);

    expect(tab.close).toHaveBeenCalled();
    expect(tab.location.href).toBe("");
  });

  it("returns false without asking when the browser blocks the tab", async () => {
    vi.spyOn(window, "open").mockReturnValue(null);
    const getLink = vi.fn();

    await expect(openReceipt(getLink)).resolves.toBe(false);

    expect(getLink).not.toHaveBeenCalled();
  });
});
