"use client";

import { useState } from "react";

import type { RehabKind } from "@/lib/api/types";

const DEFAULT_KIND: RehabKind = "evaluation";

/** The kind of session Staff chose for each Rehab slot. A slot nobody touched is an evaluation. */
export function useRehabKinds(): { kindOf(slotId: string): RehabKind; setKind(slotId: string, kind: RehabKind): void } {
  const [kinds, setKinds] = useState<ReadonlyMap<string, RehabKind>>(new Map());

  return {
    kindOf: (slotId) => kinds.get(slotId) ?? DEFAULT_KIND,
    setKind: (slotId, kind) => setKinds((current) => new Map(current).set(slotId, kind)),
  };
}
