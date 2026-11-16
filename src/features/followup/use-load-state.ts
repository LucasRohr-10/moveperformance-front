"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type LoadState<T> = "loading" | "error" | { data: T };

interface Loaded<T> {
  load: () => Promise<T>;
  value: LoadState<T>;
}

/**
 * Loads once per `load` (memoize it) and again on `reload`. A new `load` goes back to "loading";
 * a failed reload keeps what was already shown, and only a first load can end as "error".
 */
export function useLoadState<T>(load: () => Promise<T>): { state: LoadState<T>; reload: () => void } {
  const [loaded, setLoaded] = useState<Loaded<T> | null>(null);
  const latestRequest = useRef(0);
  // `run` is stable and reads the latest `load` here: a `reload` kept by an action that started before
  // `load` changed (a filter switch) must load what is on screen now, not what was on screen then.
  const latestLoad = useRef(load);

  const run = useCallback(() => {
    const request = ++latestRequest.current;
    const current = latestLoad.current;
    const apply = (next: (previous: LoadState<T>) => LoadState<T>) => {
      if (request !== latestRequest.current) return;
      setLoaded((previous) => ({
        load: current,
        value: next(previous?.load === current ? previous.value : "loading"),
      }));
    };
    current().then(
      (data) => apply(() => ({ data })),
      () => apply((previous) => (typeof previous === "object" ? previous : "error")),
    );
  }, []);

  useEffect(() => {
    latestLoad.current = load;
    run();
  }, [load, run]);

  const reload = useCallback(() => {
    setLoaded((current) => (current?.value === "error" ? { ...current, value: "loading" } : current));
    run();
  }, [run]);

  return { state: loaded?.load === load ? loaded.value : "loading", reload };
}
