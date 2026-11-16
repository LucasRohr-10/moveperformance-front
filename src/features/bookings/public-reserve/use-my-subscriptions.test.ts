import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { AuthenticatedUser, MySubscriptionsDto } from "@/lib/api/types";

vi.mock("@/features/subscriptions/get-my-subscriptions-client", () => ({
  getMySubscriptionsClient: vi.fn(),
}));

import { getMySubscriptionsClient } from "@/features/subscriptions/get-my-subscriptions-client";
import { useMySubscriptions } from "./use-my-subscriptions";

const getMySubscriptionsClientMock = vi.mocked(getMySubscriptionsClient);

const USER: AuthenticatedUser = {
  id: "u1",
  name: "Ana",
  lastName: null,
  email: "ana@example.com",
  phone: null,
  birthDate: "1990-03-12",
  role: "client",
};

const SUBSCRIPTIONS: MySubscriptionsDto = {
  performance: null,
  upcomingPerformances: [],
  recoveryPacks: [],
};

describe("useMySubscriptions", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.restoreAllMocks());

  it("does not fetch anything for an anonymous visitor", () => {
    const { result } = renderHook(() => useMySubscriptions(null));

    expect(result.current).toBeNull();
    expect(getMySubscriptionsClientMock).not.toHaveBeenCalled();
  });

  it("fetches once a user is present", async () => {
    getMySubscriptionsClientMock.mockResolvedValue(SUBSCRIPTIONS);
    const { result } = renderHook(() => useMySubscriptions(USER));

    await waitFor(() => expect(result.current).toEqual(SUBSCRIPTIONS));
    expect(getMySubscriptionsClientMock).toHaveBeenCalledTimes(1);
  });

  it("refetches when the user transitions from null to signed in", async () => {
    getMySubscriptionsClientMock.mockResolvedValue(SUBSCRIPTIONS);
    const { result, rerender } = renderHook(({ user }) => useMySubscriptions(user), {
      initialProps: { user: null as AuthenticatedUser | null },
    });
    expect(getMySubscriptionsClientMock).not.toHaveBeenCalled();

    rerender({ user: USER });

    await waitFor(() => expect(result.current).toEqual(SUBSCRIPTIONS));
  });

  it("falls back to null when the fetch fails, instead of throwing", async () => {
    getMySubscriptionsClientMock.mockRejectedValue(new Error("network"));
    const { result } = renderHook(() => useMySubscriptions(USER));

    await waitFor(() => expect(getMySubscriptionsClientMock).toHaveBeenCalledTimes(1));
    expect(result.current).toBeNull();
  });
});
