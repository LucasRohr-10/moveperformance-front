"use client";

import { useEffect, useState } from "react";

import { getMySubscriptionsClient } from "@/features/subscriptions/get-my-subscriptions-client";
import type { AuthenticatedUser, MySubscriptionsDto } from "@/lib/api/types";

/**
 * Plan/pack status for the public booking flow, where the user may sign in inline
 * mid-flow (no page reload). Null for an anonymous visitor — never fetched, so no
 * 401 round-trip — and null again if the fetch fails, so a banner can simply hide.
 */
export function useMySubscriptions(user: AuthenticatedUser | null): MySubscriptionsDto | null {
  const [subscriptions, setSubscriptions] = useState<MySubscriptionsDto | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    getMySubscriptionsClient()
      .then((result) => {
        if (!cancelled) setSubscriptions(result);
      })
      .catch(() => {
        if (!cancelled) setSubscriptions(null);
      });
    return () => {
      cancelled = true;
    };
    // Keyed on the id, not the object: a new AuthenticatedUser reference for the
    // same signed-in user must not trigger a refetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  return user ? subscriptions : null;
}
