"use client";

import { createContext, type ReactNode, useContext } from "react";

import { type InboxState, useInbox } from "./use-inbox";

const InboxContext = createContext<InboxState | null>(null);

// One state for the desktop and the mobile bell, so the count is asked once and not twice.
export function InboxProvider({ children }: { children: ReactNode }) {
  const inbox = useInbox();
  return <InboxContext.Provider value={inbox}>{children}</InboxContext.Provider>;
}

export function useInboxContext(): InboxState {
  const context = useContext(InboxContext);
  if (!context) throw new Error("useInboxContext must be used inside InboxProvider");
  return context;
}
