"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { clientsListHref, type ClientsListParams } from "./clients-list-params";

const SEARCH_DEBOUNCE_MS = 400;

// The one piece of the list that is a client component: it waits for typing to settle and then
// moves the URL; the server reads the new URL and brings the list.
export function ClientsSearchField({ params }: { params: ClientsListParams }) {
  const router = useRouter();
  const [search, setSearch] = useState(params.q);
  // The term the URL was last moved to, so the debounce never repeats it and an edit of the URL
  // from outside (the back button) is told apart from our own.
  const [pushedTerm, setPushedTerm] = useState(params.q);
  const [seenTerm, setSeenTerm] = useState(params.q);
  // The timer fires after a chip may have changed the filter: it must read the current one.
  const latestParams = useRef(params);
  useEffect(() => {
    latestParams.current = params;
  });

  // The URL changed under us: if it was not our own move, the box shows what the URL says.
  if (params.q !== seenTerm) {
    setSeenTerm(params.q);
    if (params.q !== pushedTerm) {
      setPushedTerm(params.q);
      setSearch(params.q);
    }
  }

  const moveTo = useCallback(
    (term: string) => {
      setPushedTerm(term);
      router.replace(clientsListHref({ ...latestParams.current, q: term, page: 1 }));
    },
    [router],
  );

  useEffect(() => {
    const term = search.trim();
    if (term === pushedTerm) return;
    const timer = setTimeout(() => moveTo(term), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [search, pushedTerm, moveTo]);

  function clear() {
    setSearch("");
    moveTo("");
  }

  return (
    <form role="search" aria-label="Buscar clientes" onSubmit={(event) => event.preventDefault()}>
      <div className="flex flex-wrap items-end gap-3">
        <Input
          label="Buscar"
          name="q"
          placeholder="Nombre o email"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        {params.q ? (
          <Button type="button" variant="ghost" touchTarget onClick={clear}>
            Limpiar
          </Button>
        ) : null}
      </div>
      <p role="status" className="mt-2 text-xs text-muted">
        {search.trim() !== params.q ? "Buscando…" : null}
      </p>
    </form>
  );
}
