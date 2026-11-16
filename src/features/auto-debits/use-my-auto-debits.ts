"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { ApiError } from "@/lib/api/errors";
import type { AutoDebitDto } from "@/lib/api/types";

import { cancelAutoDebit, listMyAutoDebits } from "./auto-debits-api";

export type MyAutoDebitsState = "loading" | "error" | { debits: AutoDebitDto[] };
export type CancelResult = { ok: true } | { ok: false; message: string };

const PROVIDER_ERROR_CODE = "PAYMENT_PROVIDER_ERROR";
const PROVIDER_ERROR_MESSAGE =
  "No pudimos cancelar el débito en Mercado Pago. Sigue activo: probá de nuevo en unos minutos.";
// The code the API client gives an error whose body was not JSON (a proxy page, a timeout).
const NON_JSON_ERROR_CODE = "UNKNOWN";
const FALLBACK_CANCEL_MESSAGE = "No pudimos cancelar el débito. Probá de nuevo.";

// null when the read fails: the caller decides what that means for what it already shows.
function readDebits(): Promise<AutoDebitDto[] | null> {
  return listMyAutoDebits().catch(() => null);
}

function cancelFailureMessage(error: unknown): string {
  if (!(error instanceof ApiError) || error.body.code === NON_JSON_ERROR_CODE) return FALLBACK_CANCEL_MESSAGE;
  return error.body.code === PROVIDER_ERROR_CODE ? PROVIDER_ERROR_MESSAGE : error.body.message;
}

/**
 * The debits of the signed-in client. A failed load only shows as an error while nothing is known:
 * once there are debits, a later failure keeps them on screen.
 */
export function useMyAutoDebits(): {
  state: MyAutoDebitsState;
  reload: () => void;
  cancel: (id: string) => Promise<CancelResult>;
} {
  const router = useRouter();
  const [debits, setDebits] = useState<AutoDebitDto[] | null>(null);
  const [hasFailed, setHasFailed] = useState(false);

  const apply = useCallback((read: AutoDebitDto[] | null) => {
    if (read !== null) setDebits(read);
    setHasFailed(read === null);
  }, []);

  useEffect(() => {
    let active = true;
    void readDebits().then((read) => {
      if (active) apply(read);
    });
    return () => {
      active = false;
    };
  }, [apply]);

  const reload = useCallback(() => {
    setHasFailed(false);
    void readDebits().then(apply);
  }, [apply]);

  const cancel = useCallback(
    async (id: string): Promise<CancelResult> => {
      try {
        const cancelled = await cancelAutoDebit(id);
        // The answer already says the debit is gone, so a failing refresh cannot bring it back on screen.
        setDebits((current) => current?.map((debit) => (debit.id === cancelled.id ? cancelled : debit)) ?? null);
        apply(await readDebits());
        router.refresh();
        return { ok: true };
      } catch (error) {
        return { ok: false, message: cancelFailureMessage(error) };
      }
    },
    [apply, router],
  );

  if (debits !== null) return { state: { debits }, reload, cancel };
  return { state: hasFailed ? "error" : "loading", reload, cancel };
}
