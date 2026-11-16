"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useSnackbar } from "@/components/ui/snackbar";
import type { InboxItemDto } from "@/lib/api/types";

import { getUnreadCount, listInbox, markInboxItemRead } from "./inbox-api";

export type InboxListState = "idle" | "loading" | "error" | { items: InboxItemDto[] };

export interface InboxState {
  unreadCount: number;
  list: InboxListState;
  loadList(): Promise<void>;
  markRead(id: string): Promise<void>;
  openAction(item: InboxItemDto): void;
}

const MARK_READ_ERROR = "No pudimos marcar el aviso como leído.";

function withReadAt(list: InboxListState, id: string, readAt: string | null): InboxListState {
  if (typeof list !== "object") return list;
  return { items: list.items.map((item) => (item.id === id ? { ...item, readAt } : item)) };
}

export function useInbox(): InboxState {
  const router = useRouter();
  const { showSnackbar } = useSnackbar();
  const [unreadCount, setUnreadCount] = useState(0);
  const [list, setList] = useState<InboxListState>("idle");
  const listRef = useRef<InboxListState>("idle");
  // Ids whose "read" request is in flight: they stay read on screen even if a list response that
  // started before the click arrives, and a second click on the same id sends nothing.
  const pendingReads = useRef(new Set<string>());
  // Bumped by every local change to the count, so a response that was already in flight when the
  // client marked something as read does not put the old number back.
  const countEpoch = useRef(0);

  const commitList = useCallback((next: InboxListState) => {
    listRef.current = next;
    setList(next);
  }, []);

  const refreshCount = useCallback(() => {
    const epoch = countEpoch.current;
    getUnreadCount().then(
      (count) => {
        if (epoch === countEpoch.current) setUnreadCount(count);
      },
      () => {
        // Keeps the last known count: the bell only loses freshness.
      },
    );
  }, []);

  useEffect(() => {
    refreshCount();

    function handleVisibilityChange() {
      if (!document.hidden) refreshCount();
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [refreshCount]);

  const loadList = useCallback(async () => {
    const epoch = countEpoch.current;
    if (typeof listRef.current !== "object") commitList("loading");
    try {
      const dto = await listInbox();
      const readAt = new Date().toISOString();
      commitList({
        items: dto.items.map((item) =>
          pendingReads.current.has(item.id) ? { ...item, readAt: item.readAt ?? readAt } : item,
        ),
      });
      if (epoch === countEpoch.current) setUnreadCount(dto.unreadCount);
    } catch {
      if (typeof listRef.current !== "object") commitList("error");
    }
  }, [commitList]);

  const markRead = useCallback(
    async (id: string) => {
      const current = listRef.current;
      const target = typeof current === "object" ? current.items.find((item) => item.id === id) : undefined;
      if (!target || target.readAt !== null || pendingReads.current.has(id)) return;

      pendingReads.current.add(id);
      countEpoch.current += 1;
      commitList(withReadAt(current, id, new Date().toISOString()));
      setUnreadCount((count) => Math.max(0, count - 1));

      try {
        await markInboxItemRead(id);
      } catch {
        countEpoch.current += 1;
        commitList(withReadAt(listRef.current, id, null));
        setUnreadCount((count) => count + 1);
        showSnackbar({ tone: "danger", title: MARK_READ_ERROR });
      } finally {
        pendingReads.current.delete(id);
      }
    },
    [commitList, showSnackbar],
  );

  const openAction = useCallback(
    (item: InboxItemDto) => {
      if (item.readAt === null) void markRead(item.id);
      if (item.action) router.push(item.action.href);
    },
    [markRead, router],
  );

  return useMemo(
    () => ({ unreadCount, list, loadList, markRead, openAction }),
    [unreadCount, list, loadList, markRead, openAction],
  );
}
